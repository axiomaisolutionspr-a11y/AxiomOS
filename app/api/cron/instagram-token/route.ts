import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { refreshInstagramAccessToken } from "../../../lib/instagram-token.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Called daily by Vercel Cron (vercel.json). Refreshes at most once every 7 days,
// so an outside call cannot do more than an early refresh. If CRON_SECRET is set,
// Vercel sends it as a Bearer token and anything else is rejected.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    const result = await refreshInstagramAccessToken({
      sql: databaseUrl ? neon(databaseUrl) : null,
    });
    const log = result.status === "refresh_failed" ? console.error : console.info;
    log("instagram_token_refresh", result);
    return NextResponse.json(result, {
      status: result.status === "refresh_failed" ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("instagram_token_refresh", { status: "error" });
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
