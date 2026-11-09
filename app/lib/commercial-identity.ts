import { neon } from "@neondatabase/serverless";

const TENANT = "axiomai";
type CommercialEnv = NodeJS.ProcessEnv;
const canonical = (host: string) => host.replace(/-pooler(?=\.)/, "");

export function commercialIdentityEnabled(env: CommercialEnv = process.env) {
  if (env.VERCEL_ENV === "preview" && env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED === "true") return true;
  if (env.VERCEL_ENV === "production") return env.AXIOMOS_COMMERCIAL_ENABLED === "true";
  if (env.VERCEL_ENV === "preview") return env.AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED === "true";
  return false;
}

function settings(env: CommercialEnv) {
  if (env.VERCEL_ENV === "preview" && env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED === "true") {
    return {
      database:"neondb",readerUser:"axiomos_autopilot_e2e_reader",writerUser:"axiomos_autopilot_e2e_worker",
      readerUrl:env.AXIOMOS_QA_E2E_READER_URL,writerUrl:env.AXIOMOS_QA_E2E_WORKER_URL,
      host:env.AXIOMOS_QA_E2E_DB_HOST,authUrl:env.AXIOMOS_QA_E2E_AUTH_BASE_URL,
      authHost:env.AXIOMOS_QA_E2E_AUTH_HOST,cookieSecret:env.AXIOMOS_QA_E2E_COOKIE_SECRET,
    };
  }
  return env.VERCEL_ENV === "production" ? {
    database: "neondb", readerUser: "axiomos_commercial_reader", writerUser: "axiomos_commercial_writer",
    readerUrl: env.AXIOMOS_COMMERCIAL_DATABASE_URL, writerUrl: env.AXIOMOS_COMMERCIAL_WRITER_URL,
    host: env.AXIOMOS_COMMERCIAL_DATABASE_HOST, authUrl: env.AXIOMOS_COMMERCIAL_AUTH_BASE_URL,
    authHost: env.AXIOMOS_COMMERCIAL_AUTH_HOST, cookieSecret: env.AXIOMOS_COMMERCIAL_COOKIE_SECRET,
  } : {
    database: "axiomos_offers_qa", readerUser: "axiomos_offers_qa_reader",
    writerUser: "axiomos_autopilot_qa_offer_writer",
    readerUrl: env.AXIOMOS_IDENTITY_QA_DATABASE_URL, writerUrl: env.AXIOMOS_IDENTITY_QA_OFFERS_WRITER_URL,
    host: env.AXIOMOS_IDENTITY_QA_DATABASE_HOST, authUrl: env.NEON_AUTH_BASE_URL,
    authHost: env.AXIOMOS_IDENTITY_QA_AUTH_HOST, cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
  };
}

function checkedUrl(value: string | undefined, host: string | undefined, database: string, user: string) {
  if (!value || !host) return null;
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== `/${database}` ||
        canonical(url.hostname) !== canonical(host) || url.username !== user || !url.password) return null;
    return url;
  } catch { return null; }
}

export function commercialIdentityDatabase(env: CommercialEnv = process.env) {
  if (!commercialIdentityEnabled(env)) return null;
  const config = settings(env);
  const url = checkedUrl(config.readerUrl, config.host, config.database, config.readerUser);
  if (!url) return null;
  if (env.VERCEL_ENV === "preview" && env.DATABASE_URL &&
      canonical(url.hostname) === canonical(new URL(env.DATABASE_URL).hostname)) return null;
  return neon(url.href, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
}

export function commercialOfferWriterDatabase(env: CommercialEnv = process.env) {
  if (!commercialIdentityDatabase(env)) return null;
  const config = settings(env);
  const url = checkedUrl(config.writerUrl, config.host, config.database, config.writerUser);
  if (!url || url.href === config.readerUrl) return null;
  return neon(url.href, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
}

export function commercialIdentityAuthConfig(env: CommercialEnv = process.env) {
  if (!commercialIdentityEnabled(env)) return null;
  const config = settings(env);
  if (!config.authUrl || !config.authHost || !config.cookieSecret || config.cookieSecret.length < 32) return null;
  try {
    const url = new URL(config.authUrl);
    if (url.protocol !== "https:" || url.hostname !== config.authHost ||
        url.pathname !== `/${config.database}/auth`) return null;
    return { baseUrl: url.href, cookies: { secret: config.cookieSecret, sessionDataTtl: 5 } };
  } catch { return null; }
}

export async function commercialMember(sql: NonNullable<ReturnType<typeof commercialIdentityDatabase>>, userId: string) {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(userId)) return null;
  const rows = (await sql`SELECT role, status FROM axiomos_identity.memberships
    WHERE tenant_id=${TENANT} AND user_id=${userId}::uuid AND status='active' LIMIT 1`) as Array<{
      role: "owner" | "operator" | "viewer"; status: "active"
    }>;
  return rows[0] ?? null;
}
