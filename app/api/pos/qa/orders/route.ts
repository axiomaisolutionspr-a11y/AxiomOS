import { NextRequest, NextResponse } from "next/server";
import { POS_QA_COOKIE, qaConfigured, qaDatabase, assertQaRuntimeRestricted, sameOrigin, verifyActiveQaSession } from "../../../../lib/pos/qa-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorized(request: NextRequest) {
  if (!qaConfigured()) return null;
  return verifyQaSession(request.cookies.get(POS_QA_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  const session = await authorized(request);
  if (!session) return NextResponse.json({ ok: false, reason: "qa_disabled_or_unauthorized" }, { status: 401, headers });
  try {
    await assertQaRuntimeRestricted();
    const sql = qaDatabase();
    const [,operator,orders] = await sql.transaction([
      sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
      sql`SELECT 1 FROM pos_operators WHERE merchant_id=${session.merchantId}::uuid
        AND id=${session.actorId}::uuid AND disabled_at IS NULL
        AND role IN ('owner','manager','cashier')`,
      sql`SELECT id::text,idempotency_key,status,subtotal_cents::text,
        tax_cents::text,total_cents::text,created_at FROM pos_orders
        WHERE merchant_id=${session.merchantId}::uuid
          AND created_by=${session.actorId}::uuid ORDER BY created_at DESC LIMIT 30`,
    ]);
    if (!operator.length) return NextResponse.json({ ok: false }, { status: 403, headers });
    return NextResponse.json({ ok: true, orders }, { headers });
  } catch { return NextResponse.json({ ok: false, error: "QA database unavailable." }, { status: 503, headers }); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403, headers });
  const session = await authorized(request);
  if (!session) return NextResponse.json({ ok: false, reason: "qa_disabled_or_unauthorized" }, { status: 401, headers });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 9000) return NextResponse.json({ ok: false }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ ok: false }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ ok: false }, { status: 400, headers });
  const input = body as Record<string, unknown>;
  if (typeof input.locationId !== "string" || !uuid.test(input.locationId)
    || typeof input.stationId !== "string" || !uuid.test(input.stationId)
    || typeof input.idempotencyKey !== "string"
    || !/^[A-Za-z0-9_-]{8,120}$/.test(input.idempotencyKey)
    || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50
    || !input.items.every((v: unknown) => v && typeof v === "object"
      && typeof (v as {sku?: unknown}).sku === "string"
      && (v as {sku:string}).sku.length >= 1 && (v as {sku:string}).sku.length <= 120
      && Number.isInteger((v as {quantity?: unknown}).quantity)
      && Number((v as {quantity?: unknown}).quantity) > 0
      && Number((v as {quantity?: unknown}).quantity) <= 9999)) {
    return NextResponse.json({ ok: false, error: "Orden inválida." }, { status: 400, headers });
  }
  const items = (input.items as Array<{sku:string;quantity:number}>)
    .map((v) => ({ sku: v.sku, quantity: v.quantity }));
  try {
    await assertQaRuntimeRestricted();
    const sql = qaDatabase();
    const [,rows] = await sql.transaction([
      sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
      sql`SELECT pos_qa_create_draft_order(
        ${session.merchantId}::uuid,${input.locationId}::uuid,${input.stationId}::uuid,
        ${session.actorId}::uuid,${input.idempotencyKey},${JSON.stringify(items)}::jsonb
      )::text AS id`,
    ]);
    const id = String(rows[0].id);
    const [,saved] = await sql.transaction([
      sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
      sql`SELECT id::text,status,subtotal_cents::text,tax_cents::text,total_cents::text,created_at
        FROM pos_orders WHERE id=${id}::uuid AND merchant_id=${session.merchantId}::uuid
          AND created_by=${session.actorId}::uuid LIMIT 1`,
    ]);
    return NextResponse.json({ ok: true, order: saved[0] }, { status: 201, headers });
  } catch {
    // Fail closed; do not expose merchant data, SQL statements or any secret in error responses.
    return NextResponse.json({ ok: false, error: "No se pudo guardar el borrador. Revisa los permisos, catálogo y la clave de operación." },
      { status: 409, headers });
  }
}
