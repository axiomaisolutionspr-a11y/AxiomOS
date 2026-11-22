import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { getInstagramAccessToken } from "../../lib/instagram-token.mjs";
import { graphErrorSummary, parseConversations } from "../../lib/meta-inbox.mjs";

export const FB_VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
export const IG_VERSION = "v26.0";

export async function hasValidSession() {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookie = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !cookie) return false;
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  return cookie.length === expected.length && timingSafeEqual(Buffer.from(cookie), Buffer.from(expected));
}

export async function instagramToken() {
  const url = process.env.DATABASE_URL;
  return getInstagramAccessToken(url ? neon(url) : null);
}

export function pageToken() {
  return process.env.META_PAGE_ACCESS_TOKEN?.trim() || null;
}

async function graphGet(url: URL, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.warn("META_INBOX_GRAPH_READ_FAILED", { host: url.host, ...graphErrorSummary(payload, response.status) });
    return null;
  }
  return payload;
}

export type Asset = { channel: "instagram" | "messenger"; id: string; name: string; handle?: string; picture?: string };
export type InboxMessage = { id: string; text: string; at: string | null; fromBusiness: boolean };
export type Conversation = { id: string; updatedAt: string | null; customerId: string | null; customerName: string; messages: InboxMessage[] };

export async function loadInstagram(): Promise<{ asset: Asset | null; conversations: Conversation[] }> {
  const token = await instagramToken();
  if (!token) return { asset: null, conversations: [] };
  const meUrl = new URL(`https://graph.instagram.com/${IG_VERSION}/me`);
  meUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url");
  const me = await graphGet(meUrl, token);
  if (!me) return { asset: null, conversations: [] };
  const ownIds = [me.user_id, me.id, process.env.META_INSTAGRAM_ACCOUNT_ID].filter(Boolean).map(String);
  const asset: Asset = { channel: "instagram", id: String(me.user_id || me.id), name: String(me.name || me.username || "Instagram"), handle: me.username ? `@${me.username}` : undefined, picture: me.profile_picture_url };
  const convUrl = new URL(`https://graph.instagram.com/${IG_VERSION}/me/conversations`);
  convUrl.searchParams.set("platform", "instagram");
  convUrl.searchParams.set("fields", "id,updated_time,participants,messages.limit(8){id,created_time,from,message}");
  convUrl.searchParams.set("limit", "15");
  const conv = await graphGet(convUrl, token);
  return { asset, conversations: conv ? (parseConversations(conv, ownIds) as Conversation[]) : [] };
}

export async function loadMessenger(): Promise<{ asset: Asset | null; conversations: Conversation[] }> {
  const token = pageToken();
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!token || !pageId) return { asset: null, conversations: [] };
  const pageUrl = new URL(`https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(pageId)}`);
  pageUrl.searchParams.set("fields", "id,name,picture{url}");
  const page = await graphGet(pageUrl, token);
  if (!page) return { asset: null, conversations: [] };
  const asset: Asset = { channel: "messenger", id: String(page.id), name: String(page.name || "Facebook Page"), picture: page.picture?.data?.url };
  const convUrl = new URL(`https://graph.facebook.com/${FB_VERSION}/${encodeURIComponent(pageId)}/conversations`);
  convUrl.searchParams.set("platform", "messenger");
  convUrl.searchParams.set("fields", "id,updated_time,participants,messages.limit(8){id,created_time,from,message}");
  convUrl.searchParams.set("limit", "15");
  const conv = await graphGet(convUrl, token);
  return { asset, conversations: conv ? (parseConversations(conv, [page.id]) as Conversation[]) : [] };
}
