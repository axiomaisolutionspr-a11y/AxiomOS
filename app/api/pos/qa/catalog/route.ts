import { NextRequest, NextResponse } from "next/server";
import { POS_QA_COOKIE, qaConfigured, qaDatabase, assertQaRuntimeRestricted, verifyActiveQaSession } from "../../../../lib/pos/qa-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!qaConfigured()) return NextResponse.json({ ok: false, reason: "qa_not_configured" }, { status: 503, headers });
  const session = await verifyActiveQaSession(request.cookies.get(POS_QA_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false }, { status: 401, headers });
  try {
    await assertQaRuntimeRestricted();
    const sql = qaDatabase();
    const [,actor,locations,stations,products] = await sql.transaction([
      sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
      sql`SELECT role FROM pos_operators WHERE id=${session.actorId}::uuid
        AND merchant_id=${session.merchantId}::uuid AND disabled_at IS NULL
        AND role IN ('owner','manager','cashier') LIMIT 1`,
      sql`SELECT id::text,name FROM pos_locations WHERE merchant_id=${session.merchantId}::uuid ORDER BY name LIMIT 50`,
      sql`SELECT id::text,location_id::text,display_name FROM pos_stations
        WHERE merchant_id=${session.merchantId}::uuid AND active ORDER BY display_name LIMIT 100`,
      sql`SELECT id::text,sku,description,price_cents::text,tax_basis_points
        FROM pos_catalog WHERE merchant_id=${session.merchantId}::uuid
        AND active ORDER BY description LIMIT 200`,
    ]);
    if (!actor.length) return NextResponse.json({ ok: false }, { status: 403, headers });
    return NextResponse.json({ ok: true, locations, stations, products }, { headers });
  } catch { return NextResponse.json({ ok: false, reason: "qa_db_unavailable" }, { status: 503, headers }); }
}
