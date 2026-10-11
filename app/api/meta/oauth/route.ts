import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const APP_ID = process.env.META_APP_ID || "1110045808187610";
const VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
const ORIGIN = process.env.AXIOMOS_APP_URL || "https://axiomaisolutions.org";
const SCOPES = ["pages_show_list","pages_messaging","pages_manage_metadata","pages_read_engagement","business_management","instagram_basic","instagram_manage_messages"];
function redirectUri(request: NextRequest) { const origin = process.env.AXIOMOS_APP_URL || new URL(request.url).origin || ORIGIN; return origin.replace(/\/$/, "") + "/api/meta/oauth/callback"; }
export async function GET(request: NextRequest) {
  const returnTo = new URL(request.url).searchParams.get("return_to") || "/conectar/meta";
  const state = crypto.randomUUID(); const url = new URL("https://www.facebook.com/" + VERSION + "/dialog/oauth");
  url.searchParams.set("client_id", APP_ID); url.searchParams.set("redirect_uri", redirectUri(request)); url.searchParams.set("state", state); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", SCOPES.join(","));
  const response = NextResponse.redirect(url); const cookie = { httpOnly:true, secure:true, sameSite:"lax" as const, maxAge:600, path:"/" };
  response.cookies.set("axiomai_meta_oauth_state", state, cookie); response.cookies.set("axiomai_meta_return_to", returnTo.startsWith("/") ? returnTo : "/conectar/meta", cookie); return response;
}
