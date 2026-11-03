import { NextRequest, NextResponse } from "next/server";
import { POS_QA_COOKIE, authenticateQa, issueQaSession, qaConfigured, qaDatabase, assertQaRuntimeRestricted, sameOrigin, verifyQaSession } from "../../../../lib/pos/qa-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

async function operatorActive(merchantId: string, actorId: string) {
  await assertQaRuntimeRestricted();
  const sql = qaDatabase();
  const rows = await sql`SELECT role FROM pos_operators WHERE merchant_id=${merchantId}::uuid
    AND id=${actorId}::uuid AND disabled_at IS NULL LIMIT 1`;
  return rows.length === 1 && ["owner", "manager", "cashier"].includes(String(rows[0].role));
}

export async function GET(request: NextRequest) {
  if (!qaConfigured()) return NextResponse.json({ ok: false, reason: "qa_not_configured" }, { status: 503, headers });
  const session = verifyQaSession(request.cookies.get(POS_QA_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, authenticated: false }, { status: 401, headers });
  try {
    if (!await operatorActive(session.merchantId, session.actorId))
      return NextResponse.json({ ok: false, authenticated: false }, { status: 403, headers });
    return NextResponse.json({ ok: true, authenticated: true, username: session.username }, { headers });
  } catch { return NextResponse.json({ ok: false, reason: "qa_db_unavailable" }, { status: 503, headers }); }
}

export async function POST(request: NextRequest) {
  if (!qaConfigured()) return NextResponse.json({ ok: false, reason: "qa_not_configured" }, { status: 503, headers });
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403, headers });
  let input: { username?: unknown; password?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ ok: false }, { status: 413, headers });
    input = JSON.parse(raw);
  } catch { return NextResponse.json({ ok: false }, { status: 400, headers }); }
  if (typeof input.username !== "string" || typeof input.password !== "string")
    return NextResponse.json({ ok: false }, { status: 400, headers });
  const session = authenticateQa(input.username, input.password);
  if (!session) return NextResponse.json({ ok: false, error: "Credenciales incorrectas." }, { status: 401, headers });
  try {
    if (!await operatorActive(session.merchantId, session.actorId))
      return NextResponse.json({ ok: false }, { status: 403, headers });
    const signed = issueQaSession(session);
    const response = NextResponse.json({ ok: true, username: session.username }, { headers });
    response.cookies.set(POS_QA_COOKIE, signed.value, {
      httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: signed.maxAge,
    });
    return response;
  } catch { return NextResponse.json({ ok: false, reason: "qa_db_unavailable" }, { status: 503, headers }); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403, headers });
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(POS_QA_COOKIE, "", { maxAge: 0, httpOnly: true, secure: true, sameSite: "strict", path: "/" });
  return response;
}
