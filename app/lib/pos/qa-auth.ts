import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const POS_QA_COOKIE = "axiomos_pos_qa_session";

type QaUser = {
  username: string;
  passwordHash: string; // scrypt$<salt hex>$<64-byte hex digest>
  merchantId: string;
  actorId: string;
};
export type QaSession = { username: string; merchantId: string; actorId: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cookieMaxAgeSeconds = 4 * 60 * 60;

export function qaConfigured() {
  if (process.env.VERCEL_ENV !== "preview"
    || process.env.POS_QA_ENABLED !== "true"
    || !process.env.POS_QA_DATABASE_URL
    || !process.env.POS_QA_DATABASE_HOST
    || !process.env.POS_QA_SESSION_SECRET
    || process.env.POS_QA_SESSION_SECRET.length < 32
    || !process.env.POS_QA_USERS_JSON) return false;
  try {
    const database = new URL(process.env.POS_QA_DATABASE_URL);
    return database.protocol === "postgresql:"
      && database.hostname === process.env.POS_QA_DATABASE_HOST
      && database.hostname.endsWith(".neon.tech");
  } catch { return false; }
}

export function qaDatabase() {
  if (!qaConfigured()) throw Error("QA POS no configurado.");
  return neon(process.env.POS_QA_DATABASE_URL!);
}

function users(): QaUser[] {
  try {
    const list: unknown = JSON.parse(process.env.POS_QA_USERS_JSON ?? "[]");
    if (!Array.isArray(list) || list.length === 0 || list.length > 50) return [];
    if (!list.every((v) => v && typeof v === "object" && typeof v.username === "string"
      && /^[a-z0-9._-]{3,60}$/i.test(v.username)
      && typeof v.passwordHash === "string"
      && /^scrypt\$[0-9a-f]{32,128}\$[0-9a-f]{128}$/i.test(v.passwordHash)
      && typeof v.merchantId === "string" && uuid.test(v.merchantId)
      && typeof v.actorId === "string" && uuid.test(v.actorId))) return [];
    const usernames = list.map((v: QaUser) => v.username);
    if (new Set(usernames).size !== usernames.length) return [];
    return list as QaUser[];
  } catch { return []; }
}

function mac(value: string) {
  return createHmac("sha256", process.env.POS_QA_SESSION_SECRET!).update(value).digest("base64url");
}

export function authenticateQa(username: string, password: string): QaSession | null {
  if (!qaConfigured() || password.length < 1 || password.length > 1024) return null;
  const user = users().find((item) => item.username === username);
  if (!user) return null;
  const [,saltHex,hashHex] = user.passwordHash.split("$");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return null;
  return { username: user.username, merchantId: user.merchantId, actorId: user.actorId };
}

export function issueQaSession(session: QaSession) {
  if (!qaConfigured()) throw Error("QA desactivado");
  const payload = Buffer.from(JSON.stringify({
    username: session.username,
    merchantId: session.merchantId,
    actorId: session.actorId,
    exp: Math.floor(Date.now() / 1000) + cookieMaxAgeSeconds,
    nonce: randomBytes(24).toString("base64url"),
  })).toString("base64url");
  return { value: payload + "." + mac(payload), maxAge: cookieMaxAgeSeconds };
}

export function verifyQaSession(value: string | undefined): QaSession | null {
  if (!qaConfigured() || !value || value.length > 2048) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !/^[a-zA-Z0-9_-]+$/.test(signature)) return null;
  const correct = Buffer.from(mac(payload));
  const received = Buffer.from(signature);
  if (correct.length !== received.length || !timingSafeEqual(correct, received)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const token = parsed as { username?: unknown; merchantId?: unknown; actorId?: unknown; exp?: unknown };
    if (typeof token.exp !== "number" || !Number.isInteger(token.exp)
      || token.exp <= Math.floor(Date.now() / 1000)) return null;
    const current = users().find((u) => u.username === token.username
      && u.merchantId === token.merchantId && u.actorId === token.actorId);
    return current ? { username: current.username, merchantId: current.merchantId, actorId: current.actorId } : null;
  } catch { return null; }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

/** Reject Neon-generated elevated users; RLS bypass invalidates tenant separation. */
export async function assertQaRuntimeRestricted(): Promise<void> {
  const sql = qaDatabase();
  const role = await sql`SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname=current_user LIMIT 1`;
  if (role.length !== 1 || role[0].rolbypassrls !== false || role[0].rolsuper !== false) {
    throw new Error("POS QA runtime requires a non-privileged Postgres role with RLS enforced.");
  }
}

/** Only hashes of session cookies are kept in Neon. No raw cookie or password. */
export function qaSessionHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** A valid HMAC cookie alone is NOT a session: Neon must confirm it remains active. */
export async function verifyActiveQaSession(value: string | undefined): Promise<QaSession | null> {
  const session = verifyQaSession(value);
  if (!session || !value) return null;
  await assertQaRuntimeRestricted();
  const sql = qaDatabase();
  const hash = qaSessionHash(value);
  const [,rows] = await sql.transaction([
    sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
    sql`SELECT s.token_hash FROM pos_qa_sessions s
      JOIN pos_operators o ON o.merchant_id=s.merchant_id AND o.id=s.actor_id
      WHERE s.token_hash=${hash} AND s.merchant_id=${session.merchantId}::uuid
        AND s.actor_id=${session.actorId}::uuid AND s.username=${session.username}
        AND s.revoked_at IS NULL AND s.expires_at>now() AND o.disabled_at IS NULL
        AND o.role IN ('owner','manager','cashier') LIMIT 1`,
  ]);
  return rows.length === 1 ? session : null;
}

export async function persistQaSession(value: string, session: QaSession): Promise<void> {
  const verified = verifyQaSession(value);
  if (!verified || verified.username !== session.username ||
    verified.actorId !== session.actorId || verified.merchantId !== session.merchantId) {
    throw Error("QA session identity mismatch");
  }
  await assertQaRuntimeRestricted();
  const sql = qaDatabase();
  const hash = qaSessionHash(value);
  const [,saved] = await sql.transaction([
    sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
    sql`INSERT INTO pos_qa_sessions
      (token_hash,merchant_id,actor_id,username,expires_at)
      VALUES (${hash},${session.merchantId}::uuid,${session.actorId}::uuid,
        ${session.username},now() + interval '4 hours') RETURNING token_hash`,
  ]);
  if (saved.length !== 1) throw Error("Failed to persist QA session");
}

export async function revokeQaSession(value: string): Promise<boolean> {
  const session = verifyQaSession(value);
  if (!session) return false;
  await assertQaRuntimeRestricted();
  const sql = qaDatabase();
  const hash = qaSessionHash(value);
  const [,revoked] = await sql.transaction([
    sql`SELECT set_config('axiomos.merchant_id', ${session.merchantId}, true)`,
    sql`UPDATE pos_qa_sessions SET revoked_at=now()
      WHERE token_hash=${hash} AND merchant_id=${session.merchantId}::uuid
        AND actor_id=${session.actorId}::uuid AND username=${session.username}
        AND revoked_at IS NULL RETURNING token_hash`,
  ]);
  return revoked.length === 1;
}
