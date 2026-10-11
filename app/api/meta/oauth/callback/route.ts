import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
const APP_ID = process.env.META_APP_ID || "1110045808187610";
const ORIGIN = process.env.AXIOMOS_APP_URL || "https://axiomaisolutions.org";
function callbackUri(request: NextRequest) { const origin = process.env.AXIOMOS_APP_URL || new URL(request.url).origin || ORIGIN; return origin.replace(/\/$/, "") + "/api/meta/oauth/callback"; }
function finish(request: NextRequest, path: string, params: Record<string,string>) { const origin = process.env.AXIOMOS_APP_URL || new URL(request.url).origin || ORIGIN; const url = new URL(path, origin); Object.entries(params).forEach(([key,value]) => url.searchParams.set(key,value)); return NextResponse.redirect(url); }
export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams; const returnTo = request.cookies.get("axiomai_meta_return_to")?.value || "/conectar/meta"; const state = query.get("state"); const expected = request.cookies.get("axiomai_meta_oauth_state")?.value; const code = query.get("code");
  if (!state || !expected || state !== expected) return finish(request, returnTo, {meta:"error", reason:"state"});
  if (!code) return finish(request, returnTo, {meta:"cancelled"});
  const secret = process.env.META_APP_SECRET; if (!secret) return finish(request, returnTo, {meta:"error", reason:"server_config"});
  try {
    const tokenUrl = new URL("https://graph.facebook.com/" + VERSION + "/oauth/access_token"); tokenUrl.searchParams.set("client_id", APP_ID); tokenUrl.searchParams.set("client_secret", secret); tokenUrl.searchParams.set("redirect_uri", callbackUri(request)); tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl, {cache:"no-store"}); if (!tokenResponse.ok) return finish(request, returnTo, {meta:"error", reason:"token_exchange"}); const tokenData = await tokenResponse.json() as {access_token?:string}; if (!tokenData.access_token) return finish(request, returnTo, {meta:"error", reason:"missing_token"});
    const pagesUrl = new URL("https://graph.facebook.com/" + VERSION + "/me/accounts"); pagesUrl.searchParams.set("fields", "id,name,access_token,tasks"); pagesUrl.searchParams.set("access_token", tokenData.access_token); const pagesResponse = await fetch(pagesUrl, {cache:"no-store"}); if (!pagesResponse.ok) return finish(request, returnTo, {meta:"error", reason:"pages_lookup"}); const pagesData = await pagesResponse.json() as {data?:Array<{id?:string;name?:string}>}; const page = pagesData.data?.find(item => item.id === process.env.META_PAGE_ID) || pagesData.data?.[0]; if (!page?.id) return finish(request, returnTo, {meta:"error", reason:"no_page"});
    const response = finish(request, returnTo, {meta:"connected", page:page.name || "Página conectada"}); response.cookies.set("axiomai_meta_connected", "1", {httpOnly:true,secure:true,sameSite:"lax",maxAge:86400,path:"/"}); return response;
  } catch (error) { console.error("META_OAUTH_CALLBACK_ERROR", error); return finish(request, returnTo, {meta:"error", reason:"network"}); }
}
