import { createHash } from "node:crypto";

// The Instagram long-lived token (Instagram API with Instagram Login) lasts ~60 days
// and can be refreshed once it is at least 24 h old. The refreshed token is kept in
// public.integration_tokens; INSTAGRAM_ACCESS_TOKEN in Vercel is the seed. If someone
// pastes a new token in Vercel, its hash no longer matches seed_hash and the env token
// wins again until the next refresh. Token values are never logged or returned.
export const INSTAGRAM_TOKEN_NAME = "instagram_access_token";
export const REFRESH_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

async function readRow(sql) {
  const rows = await sql`
    SELECT token, seed_hash, refreshed_at
    FROM public.integration_tokens
    WHERE name = ${INSTAGRAM_TOKEN_NAME}`;
  return rows[0] ?? null;
}

export async function getInstagramAccessToken(sql, env = process.env) {
  const envToken = env.INSTAGRAM_ACCESS_TOKEN || null;
  if (!sql || !envToken) return envToken;
  try {
    const row = await readRow(sql);
    if (row?.token && row.seed_hash === hash(envToken)) return row.token;
  } catch {
    console.warn("instagram_token_store_unavailable");
  }
  return envToken;
}

export async function refreshInstagramAccessToken({
  sql,
  env = process.env,
  fetchImpl = fetch,
  now = new Date(),
}) {
  const envToken = env.INSTAGRAM_ACCESS_TOKEN;
  if (!envToken) return { status: "missing_env_token" };
  if (!sql) return { status: "missing_database" };

  const seedHash = hash(envToken);
  const row = await readRow(sql);
  const fromStore = Boolean(row?.token && row.seed_hash === seedHash);
  const current = fromStore ? row.token : envToken;
  const last = fromStore ? new Date(row.refreshed_at).getTime() : null;

  if (last && now.getTime() - last < REFRESH_EVERY_MS) {
    return { status: "fresh", refreshedAt: new Date(last).toISOString() };
  }

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", current);
  const response = await fetchImpl(url, { method: "GET", cache: "no-store" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data?.access_token !== "string" || data.access_token.length < 20) {
    return {
      status: "refresh_failed",
      httpStatus: response.status,
      errorCode: data?.error?.code ?? null,
    };
  }

  const seconds = Number(data.expires_in);
  const expiresAt = Number.isFinite(seconds) && seconds > 0
    ? new Date(now.getTime() + seconds * 1000).toISOString()
    : null;

  await sql`
    INSERT INTO public.integration_tokens (name, token, seed_hash, expires_at, refreshed_at)
    VALUES (${INSTAGRAM_TOKEN_NAME}, ${data.access_token}, ${seedHash}, ${expiresAt}, ${now.toISOString()})
    ON CONFLICT (name) DO UPDATE SET
      token = EXCLUDED.token,
      seed_hash = EXCLUDED.seed_hash,
      expires_at = EXCLUDED.expires_at,
      refreshed_at = EXCLUDED.refreshed_at`;

  return { status: "refreshed", expiresAt };
}
