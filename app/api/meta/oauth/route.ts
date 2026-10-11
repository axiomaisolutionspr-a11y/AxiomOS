import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_APP_ID = process.env.META_APP_ID || "1110045808187610";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
const DEFAULT_ORIGIN = process.env.AXIOMOS_APP_URL || "https://axiomaisolutions.org";
const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "business_management",
];

function getRedirectUri(request: NextRequest) {
  const origin = process.env.AXIOMOS_APP_URL || new URL(request.url).origin || DEFAULT_ORIGIN;
  return origin.replace(new RegExp("/$"), "") + "/api/meta/oauth/callback";
}

export async function GET(request: NextRequest) {
  const returnTo = new URL(request.url).searchParams.get("return_to") || "/conectar/meta";
  const state = crypto.randomUUID();
  const oauthUrl = new URL("https://www.facebook.com/" + GRAPH_VERSION + "/dialog/oauth");
  oauthUrl.searchParams.set("client_id", META_APP_ID);
  oauthUrl.searchParams.set("redirect_uri", getRedirectUri(request));
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", OAUTH_SCOPES.join(","));

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("axiomai_meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("axiomai_meta_return_to", returnTo.startsWith("/") ? returnTo : "/conectar/meta", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
