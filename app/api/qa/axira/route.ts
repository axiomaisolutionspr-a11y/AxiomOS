import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only verification for this one experimental branch. Never returns
// credentials, connection strings, customer records or provider responses.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "feature/axira-whatsapp-service-menu") {
    return new Response(null, { status: 404, headers });
  }

  let databaseHostIsQa = false;
  try {
    const connection = new URL(process.env.DATABASE_URL || "");
    databaseHostIsQa = ["postgres:", "postgresql:"].includes(connection.protocol) &&
      ["ep-flat-art-av3pifin.c-11.us-east-1.aws.neon.tech",
       "ep-flat-art-av3pifin-pooler.c-11.us-east-1.aws.neon.tech"].includes(connection.hostname);
  } catch { /* Invalid configuration remains closed. */ }

  const checks = {
    databaseHostIsQa,
    menuDisabled: process.env.AXIRA_WHATSAPP_MENU_ENABLED === "false",
    smsDisabled: process.env.WHATSAPP_SMS_ALERTS_ENABLED === "false",
    emailDisabled: process.env.EMAIL_ENABLED === "false",
    whatsappOutboundCredentialAbsent: !process.env.DUALHOOK_API_KEY?.trim(),
  };
  if (!Object.values(checks).every(Boolean)) {
    return Response.json({ ok: false, checks, databaseReachable: false }, { status: 503, headers });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT 1 AS connected`;
    const databaseReachable = rows[0]?.connected === 1;
    return Response.json({ ok: databaseReachable, checks, databaseReachable },
      { status: databaseReachable ? 200 : 503, headers });
  } catch {
    // Driver errors can contain connection details; do not return or log them.
    return Response.json({ ok: false, checks, databaseReachable: false }, { status: 503, headers });
  }
}
