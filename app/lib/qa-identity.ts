import { neon } from "@neondatabase/serverless";

const DATABASE = "/axiomos_offers_qa";
const TENANT = "axiomai";
export function qaIdentityEnabled(env = process.env) {
  return env.AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED === "true" &&
    (env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && env.NODE_ENV !== "production"));
}

export function qaIdentityDatabase(env = process.env) {
  if (!qaIdentityEnabled(env) || !env.AXIOMOS_IDENTITY_QA_DATABASE_URL || !env.AXIOMOS_IDENTITY_QA_DATABASE_HOST) return null;
  try {
    const url = new URL(env.AXIOMOS_IDENTITY_QA_DATABASE_URL);
    const canonical = (host: string) => host.replace(/-pooler(?=\.)/, "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== DATABASE ||
      canonical(url.hostname) !== canonical(env.AXIOMOS_IDENTITY_QA_DATABASE_HOST) ||
      (env.DATABASE_URL && canonical(url.hostname) === canonical(new URL(env.DATABASE_URL).hostname))) return null;
    return neon(url.href, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
  } catch { return null; }
}

export function qaIdentityAuthConfig(env = process.env) {
  if (!qaIdentityEnabled(env) || !env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET ||
      env.NEON_AUTH_COOKIE_SECRET.length < 32 || !env.AXIOMOS_IDENTITY_QA_AUTH_HOST) return null;
  try {
    const url = new URL(env.NEON_AUTH_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== env.AXIOMOS_IDENTITY_QA_AUTH_HOST ||
        url.pathname !== `${DATABASE}/auth`) return null;
    return {baseUrl:url.href,cookies:{secret:env.NEON_AUTH_COOKIE_SECRET,sessionDataTtl:5}};
  } catch { return null; }
}

export async function qaMember(sql: NonNullable<ReturnType<typeof qaIdentityDatabase>>, userId: string) {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(userId)) return null;
  const rows = await sql`SELECT role, status FROM axiomos_identity.memberships
    WHERE tenant_id=${TENANT} AND user_id=${userId}::uuid AND status='active' LIMIT 1` as Array<{role:"owner"|"operator"|"viewer";status:"active"}>;
  return rows[0] ?? null;
}
