import { neon } from "@neondatabase/serverless";

const TENANT = "axiomai";
const QA_DATABASE = "/axiomos_offers_qa";
const QA_ACTOR = "qa-shared-credential";

export function offersPilotEnabled(env = process.env) {
  return env.AXIRA_OFFERS_QA_ENABLED === "true" &&
    (env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && env.NODE_ENV !== "production"));
}

export function offersPilotDatabase(env = process.env) {
  if (!offersPilotEnabled(env) || !env.AXIRA_OFFERS_QA_DATABASE_URL || !env.AXIRA_OFFERS_QA_DATABASE_HOST) {
    return null;
  }

  const canonicalHost = (host) => host.replace(/-pooler(?=\.)/, "");
  try {
    const url = new URL(env.AXIRA_OFFERS_QA_DATABASE_URL);
    const host = canonicalHost(url.hostname);
    const legacyHost = env.DATABASE_URL ? canonicalHost(new URL(env.DATABASE_URL).hostname) : null;
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== QA_DATABASE ||
      host !== canonicalHost(env.AXIRA_OFFERS_QA_DATABASE_HOST) || host === legacyHost) {
      return null;
    }
    return neon(url.href, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
  } catch {
    return null;
  }
}

export async function loadCurrentOffers(channel, sql = offersPilotDatabase()) {
  if (!sql) return { status: "unavailable", offers: [] };
  try {
    const offers = await sql`
      SELECT id::text, product_key, name, normal_cents, promo_cents, activation_cents,
        TO_CHAR(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at,
        TO_CHAR(ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ends_at, tax_included, terms_es, terms_en, external_es, external_en,
        max_clients, status, revision
      FROM axiomos_commercial.offers
      WHERE tenant_id = ${TENANT} AND status = 'approved' AND ${channel} = ANY(channels)
        AND starts_at <= statement_timestamp() AND statement_timestamp() < ends_at
      ORDER BY ends_at, id
    `;
    return { status: "ok", offers };
  } catch (error) {
    console.error("AXIRA_OFFERS_READ_FAILED", error?.code ?? "unknown");
    return { status: "unavailable", offers: [] };
  }
}

export function listOffers(sql) {
  return sql`
    SELECT id::text, product_key, name, normal_cents, promo_cents, activation_cents,
      FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint::text AS checked_at_ms,
      TO_CHAR(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at,
      TO_CHAR(ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ends_at, channels, tax_included, terms_es, terms_en,
      external_es, external_en, max_clients, status, revision
    FROM axiomos_commercial.offers WHERE tenant_id = ${TENANT}
    ORDER BY created_at DESC, id DESC LIMIT 80
  `;
}

export function listOfferAudit(sql) {
  return sql`
    SELECT offer_id::text, revision, status, actor,
      TO_CHAR(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS recorded_at
    FROM axiomos_commercial.offer_audit WHERE tenant_id = ${TENANT}
    ORDER BY recorded_at DESC, offer_id DESC, revision DESC LIMIT 20
  `;
}

export function saveOfferDraft(sql, offer, requestId) {
  return sql`
    WITH created AS (
      INSERT INTO axiomos_commercial.offers
        (tenant_id, product_key, request_id, name, normal_cents, promo_cents, activation_cents,
         starts_at, ends_at, channels, tax_included, terms_es, terms_en, external_es, external_en, max_clients)
      VALUES (${TENANT}, ${offer.product}, ${requestId}::uuid, ${offer.name},
        ${offer.normal}, ${offer.promo}, ${offer.activation}, ${offer.start}::timestamptz, ${offer.end}::timestamptz,
        ${offer.channels}::text[], ${offer.taxIncluded}, ${offer.termsEs}, ${offer.termsEn},
        ${offer.externalEs}, ${offer.externalEn}, ${offer.maxClients})
      ON CONFLICT (tenant_id, request_id) DO NOTHING
      RETURNING tenant_id, id, revision, status
    )
    INSERT INTO axiomos_commercial.offer_audit (tenant_id, offer_id, revision, status, actor)
    SELECT tenant_id, id, revision, status, ${QA_ACTOR} FROM created
    RETURNING offer_id::text AS id
  `;
}

export function setOfferStatus(sql, id, revision, target) {
  return sql`
    WITH changed AS (
      UPDATE axiomos_commercial.offers
      SET status = ${target}, revision = revision + 1
      WHERE tenant_id = ${TENANT} AND id = ${id}::bigint AND revision = ${revision}::integer
        AND (
          (${target} = 'approved' AND status IN ('draft', 'paused') AND statement_timestamp() < ends_at)
          OR (${target} = 'paused' AND status = 'approved')
        )
      RETURNING tenant_id, id, revision, status
    )
    INSERT INTO axiomos_commercial.offer_audit (tenant_id, offer_id, revision, status, actor)
    SELECT tenant_id, id, revision, status, ${QA_ACTOR} FROM changed
    RETURNING offer_id::text AS id, revision
  `;
}
