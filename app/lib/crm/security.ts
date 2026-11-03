import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Feature gate: keep production's existing login working until QA passes.
// Enabling v2 requires applying db/migrations/20261103_crm_sessions.sql first.
export const CRM_COOKIE = "axiomos_crm_session";
export const CRM_SESSION_SECONDS = 12 * 60 * 60;
export const crmV2Enabled = () => process.env.AXIOMOS_CRM_SESSION_V2_ENABLED === "true";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("CRM_DATABASE_NOT_CONFIGURED");
  return neon(process.env.DATABASE_URL);
};
const assertRateKey = () => {
  if (!process.env.AXIOMOS_CRM_RATE_LIMIT_SECRET || process.env.AXIOMOS_CRM_RATE_LIMIT_SECRET.length < 32) {
    throw new Error("CRM_RATE_LIMIT_SECRET_NOT_CONFIGURED");
  }
  return process.env.AXIOMOS_CRM_RATE_LIMIT_SECRET;
};
export function crmCookieOptions(maxAge = CRM_SESSION_SECONDS) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}
export function matchesLegacyCrmCookie(cookie: string | undefined) {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  if (!pin || !cookie) return false;
  const expected = digest(`axiomos-crm:${pin}`);
  const received = Buffer.from(cookie);
  return received.length === expected.length && timingSafeEqual(received, Buffer.from(expected));
}
export async function validCrmSession(cookie: string | undefined): Promise<boolean> {
  if (!crmV2Enabled()) return matchesLegacyCrmCookie(cookie);
  if (!cookie || !/^v2\.[a-f0-9]{64}$/.test(cookie)) return false;
  const sql = database();
  const rows = await sql`UPDATE crm_admin_sessions SET last_seen_at = NOW()
    WHERE token_hash = ${digest(cookie)} AND revoked_at IS NULL
      AND expires_at > NOW() AND last_seen_at > NOW() - INTERVAL '30 minutes'
    RETURNING token_hash`;
  return rows.length === 1;
}
export async function createCrmSession() {
  if (!crmV2Enabled()) throw new Error("CRM_V2_DISABLED");
  const token = "v2." + randomBytes(32).toString("hex");
  const sql = database();
  await sql`INSERT INTO crm_admin_sessions (token_hash, expires_at)
    VALUES (${digest(token)}, NOW() + INTERVAL '12 hours')`;
  return token;
}
export async function revokeCrmSession(cookie: string | undefined) {
  if (!crmV2Enabled() || !cookie || !/^v2\.[a-f0-9]{64}$/.test(cookie)) return false;
  const sql = database();
  const rows = await sql`UPDATE crm_admin_sessions SET revoked_at=NOW()
    WHERE token_hash=${digest(cookie)} AND revoked_at IS NULL RETURNING token_hash`;
  return rows.length === 1;
}
export async function claimCrmLoginAttempt(headers: Headers): Promise<boolean> {
  if (!crmV2Enabled()) return true;
  const secret = assertRateKey();
  // Vercel's trusted forwarding header when available; use a conservative
  // single bucket in environments without a trusted source IP.
  const address = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = createHmac("sha256", secret).update(address).digest("hex");
  const sql = database();
  const rows = await sql`INSERT INTO crm_auth_attempts (client_hash, attempts, window_ends_at)
    VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (client_hash) DO UPDATE SET
      attempts=CASE WHEN crm_auth_attempts.window_ends_at<=NOW() THEN 1 ELSE crm_auth_attempts.attempts+1 END,
      window_ends_at=CASE WHEN crm_auth_attempts.window_ends_at<=NOW()
        THEN NOW() + INTERVAL '15 minutes' ELSE crm_auth_attempts.window_ends_at END
    RETURNING attempts`;
  return Number(rows[0]?.attempts) <= 5;
}
export async function resetCrmLoginAttempts(headers: Headers) {
  if (!crmV2Enabled()) return;
  const secret = assertRateKey();
  const address = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = createHmac("sha256", secret).update(address).digest("hex");
  const sql = database();
  await sql`DELETE FROM crm_auth_attempts WHERE client_hash=${key}`;
}
