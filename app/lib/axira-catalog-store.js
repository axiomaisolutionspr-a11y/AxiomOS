// Centro Comercial y Conocimiento de Axira — acceso a datos.
// Toda operación corre en una transacción que fija axiomos.tenant_id (RLS) y,
// además, filtra explícitamente por tenant_id (defensa en profundidad).
import { neon } from "@neondatabase/serverless";
import { commercialOffersDatabase } from "./axira-offers-store.js";

export const AXIOMAI_TENANT = "axiomai";
const TENANT_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const KEY_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const TABLE = { item: "axiomos_commercial.catalog_items", knowledge: "axiomos_commercial.knowledge_entries" };
const KEY_COLUMN = { item: "item_key", knowledge: "entry_key" };
const ITEM_FIELDS = ["kind", "name", "summary", "category", "pricing_mode", "currency", "billing_period", "regular_cents",
  "promo_cents", "promo_months", "promo_valid_until", "users_included", "limits", "benefits", "restrictions",
  "channels", "valid_from", "valid_until"];
const KNOWLEDGE_FIELDS = ["topic", "language", "title", "answer", "keywords", "valid_from", "valid_until"];
const FIELDS = { item: ITEM_FIELDS, knowledge: KNOWLEDGE_FIELDS };
const TS = (column) => `TO_CHAR(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const SELECT = {
  item: `id::text, tenant_id, item_key AS key, version, kind, name, summary, category, pricing_mode, currency,
    billing_period, regular_cents, promo_cents, promo_months, ${TS("promo_valid_until")} AS promo_valid_until,
    users_included, limits, benefits, restrictions, channels, ${TS("valid_from")} AS valid_from,
    ${TS("valid_until")} AS valid_until, status, change_reason, created_by, ${TS("created_at")} AS created_at,
    approved_by, published_by`,
  knowledge: `id::text, tenant_id, entry_key AS key, version, topic, language, title, answer, keywords,
    ${TS("valid_from")} AS valid_from, ${TS("valid_until")} AS valid_until, status, change_reason, created_by,
    ${TS("created_at")} AS created_at, approved_by, published_by`,
};

/** Adapta el cliente HTTP de Neon a {run, tx}. */
export function neonCatalogDb(sql) {
  if (!sql) return null;
  return {
    run: (text, params = []) => sql.query(text, params),
    tx: (queries) => sql.transaction(queries.map(({ text, params = [] }) => sql.query(text, params))),
  };
}

function checkTenant(tenant) {
  if (!TENANT_RE.test(String(tenant ?? ""))) throw Object.assign(new Error("tenant inválido"), { code: "TENANT" });
  return tenant;
}
function checkKey(key) {
  if (!KEY_RE.test(String(key ?? ""))) throw Object.assign(new Error("clave inválida"), { code: "KEY" });
  return key;
}
function checkEntity(entity) {
  if (!Object.hasOwn(TABLE, entity)) throw Object.assign(new Error("entidad inválida"), { code: "ENTITY" });
  return entity;
}

/** Ejecuta consultas en una transacción con el tenant fijado. Devuelve las filas de cada consulta (sin la de contexto). */
export async function inTenant(db, tenant, queries) {
  const results = await db.tx([
    { text: "SELECT set_config('axiomos.tenant_id', $1, true)", params: [checkTenant(tenant)] },
    ...queries,
  ]);
  return results.slice(1).map((r) => (Array.isArray(r) ? r : r?.rows ?? []));
}

/** Catálogo publicado y vigente que Axira puede usar (solo lectura). */
export async function loadPublishedCatalog(db, tenant = AXIOMAI_TENANT, channel = "web") {
  if (!db) return { status: "unavailable", items: [], knowledge: [] };
  try {
    const [items, knowledge] = await inTenant(db, tenant, [
      {
        text: `SELECT ${SELECT.item} FROM ${TABLE.item}
          WHERE tenant_id = $1 AND status = 'published' AND $2 = ANY(channels)
            AND valid_from <= statement_timestamp() AND (valid_until IS NULL OR statement_timestamp() < valid_until)
          ORDER BY kind, name`,
        params: [tenant, channel],
      },
      {
        text: `SELECT ${SELECT.knowledge} FROM ${TABLE.knowledge}
          WHERE tenant_id = $1 AND status = 'published'
            AND valid_from <= statement_timestamp() AND (valid_until IS NULL OR statement_timestamp() < valid_until)
          ORDER BY topic, title`,
        params: [tenant],
      },
    ]);
    return { status: "ok", items, knowledge };
  } catch (error) {
    console.error("AXIRA_CATALOG_READ_FAILED", error?.code ?? "unknown");
    return { status: "unavailable", items: [], knowledge: [] };
  }
}

/** Todas las versiones (panel administrativo). */
export async function listCatalog(db, tenant = AXIOMAI_TENANT) {
  const [items, knowledge, audit] = await inTenant(db, tenant, [
    { text: `SELECT ${SELECT.item} FROM ${TABLE.item} WHERE tenant_id = $1 ORDER BY item_key, version DESC LIMIT 400`, params: [tenant] },
    { text: `SELECT ${SELECT.knowledge} FROM ${TABLE.knowledge} WHERE tenant_id = $1 ORDER BY entry_key, version DESC LIMIT 400`, params: [tenant] },
    {
      text: `SELECT id::text, entity, entity_key, version, action, from_status, to_status, actor, reason,
          ${TS("recorded_at")} AS recorded_at
        FROM axiomos_commercial.catalog_audit WHERE tenant_id = $1 ORDER BY recorded_at DESC, id DESC LIMIT 60`,
      params: [tenant],
    },
  ]);
  return { items, knowledge, audit };
}

/** Crea una versión nueva en borrador (la siguiente a la última existente de esa clave). */
export async function createDraft(db, tenant, entity, key, value, actor, reason = "") {
  checkEntity(entity); checkTenant(tenant); checkKey(key);
  const fields = FIELDS[entity];
  const keyColumn = KEY_COLUMN[entity];
  const params = [tenant, key, ...fields.map((f) => (f === "limits" ? JSON.stringify(value[f] ?? {}) : value[f] ?? null)),
    String(reason).slice(0, 300), actor];
  const fieldValues = fields.map((f, i) => (f === "limits" ? `$${i + 3}::jsonb` : `$${i + 3}`));
  const reasonParam = `$${fields.length + 3}`, actorParam = `$${fields.length + 4}`;
  const [inserted] = await inTenant(db, tenant, [
    {
      text: `INSERT INTO ${TABLE[entity]} (tenant_id, ${keyColumn}, version, ${fields.join(", ")}, status, change_reason, created_by)
        VALUES ($1, $2,
          (SELECT COALESCE(MAX(version), 0) + 1 FROM ${TABLE[entity]} WHERE tenant_id = $1 AND ${keyColumn} = $2),
          ${fieldValues.join(", ")}, 'draft', ${reasonParam}, ${actorParam})
        RETURNING ${keyColumn} AS key, version`,
      params,
    },
    auditLatest(tenant, entity, key, "create_draft", null, "draft", actor, reason),
  ]);
  return inserted[0];
}

function auditLatest(tenant, entity, key, action, fromStatus, toStatus, actor, reason) {
  return {
    text: `INSERT INTO axiomos_commercial.catalog_audit
        (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
      SELECT t.tenant_id, $2, $3, t.version, $4, $5, $6, $7, $8, to_jsonb(t) - 'id'
      FROM ${TABLE[entity]} t WHERE t.tenant_id = $1 AND t.${KEY_COLUMN[entity]} = $3
      ORDER BY t.version DESC LIMIT 1`,
    params: [tenant, entity, key, action, fromStatus, toStatus, actor, String(reason).slice(0, 300)],
  };
}

const TRANSITIONS = {
  approved: { from: ["draft"], action: "approve", stamp: "approved" },
  published: { from: ["approved"], action: "publish", stamp: "published" },
  archived: { from: ["draft", "approved", "published"], action: "archive", stamp: "archived" },
};

/** approve | publish | archive. Falla con code STALE si la versión ya no está en el estado esperado. */
export async function transition(db, tenant, entity, key, version, target, actor, reason = "") {
  checkEntity(entity); checkTenant(tenant); checkKey(key);
  const rule = TRANSITIONS[target];
  if (!rule) throw Object.assign(new Error("estado inválido"), { code: "TARGET" });
  const table = TABLE[entity], keyColumn = KEY_COLUMN[entity];
  const queries = [];
  if (target === "published") {
    // La versión publicada anterior de la misma clave se archiva en la misma transacción.
    queries.push({
      text: `WITH prev AS (
          UPDATE ${table} SET status = 'archived', archived_by = $3, archived_at = now()
          WHERE tenant_id = $1 AND ${keyColumn} = $2 AND status = 'published' AND version <> $4
          RETURNING *
        )
        INSERT INTO axiomos_commercial.catalog_audit
          (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
        SELECT tenant_id, $5, $2, version, 'archive', 'published', 'archived', $3,
          'Reemplazada por una versión nueva', to_jsonb(prev) - 'id'
        FROM prev`,
      params: [tenant, key, actor, version, entity],
    });
  }
  queries.push({
    text: `WITH changed AS (
        UPDATE ${table} SET status = $5, ${rule.stamp}_by = $4, ${rule.stamp}_at = now()
        WHERE tenant_id = $1 AND ${keyColumn} = $2 AND version = $3 AND status = ANY($6::text[])
          AND (valid_until IS NULL OR now() < valid_until OR $5 = 'archived')
        RETURNING *, status AS old_status_placeholder
      ), logged AS (
        INSERT INTO axiomos_commercial.catalog_audit
          (tenant_id, entity, entity_key, version, action, from_status, to_status, actor, reason, snapshot)
        SELECT tenant_id, $7, $2, version, $8, $9, status, $4, $10, to_jsonb(changed) - 'id' - 'old_status_placeholder'
        FROM changed
        RETURNING version
      )
      SELECT c.${keyColumn} AS key, c.version, c.status FROM changed c JOIN logged l ON l.version = c.version`,
    params: [tenant, key, version, actor, target, rule.from, entity, rule.action,
      rule.from.length === 1 ? rule.from[0] : null, String(reason).slice(0, 300)],
  });
  const results = await inTenant(db, tenant, queries);
  const changed = results[results.length - 1];
  if (!changed.length) {
    throw Object.assign(new Error("La versión cambió, venció o no admite esa transición"), { code: "STALE" });
  }
  return changed[0];
}

/** Restaura una versión anterior autorizada creando una versión nueva ya aprobada (falta publicarla). */
export async function restoreVersion(db, tenant, entity, key, fromVersion, actor, reason = "") {
  checkEntity(entity); checkTenant(tenant); checkKey(key);
  const fields = FIELDS[entity];
  const keyColumn = KEY_COLUMN[entity];
  const [rows] = await inTenant(db, tenant, [
    {
      text: `INSERT INTO ${TABLE[entity]} (tenant_id, ${keyColumn}, version, ${fields.join(", ")}, status, change_reason,
          created_by, approved_by, approved_at)
        SELECT tenant_id, ${keyColumn},
          (SELECT MAX(version) + 1 FROM ${TABLE[entity]} WHERE tenant_id = $1 AND ${keyColumn} = $2),
          ${fields.join(", ")}, 'approved', $5, $4, $4, now()
        FROM ${TABLE[entity]} src
        WHERE src.tenant_id = $1 AND src.${keyColumn} = $2 AND src.version = $3
          AND (src.approved_by IS NOT NULL OR src.status IN ('approved', 'published'))
          AND (src.valid_until IS NULL OR statement_timestamp() < src.valid_until)
        RETURNING ${keyColumn} AS key, version`,
      params: [tenant, key, fromVersion, actor, `Restaurada desde v${fromVersion}. ${String(reason)}`.slice(0, 300)],
    },
  ]);
  if (!rows.length) {
    throw Object.assign(new Error("Solo se pueden restaurar versiones aprobadas y vigentes"), { code: "RESTORE" });
  }
  await inTenant(db, tenant, [auditLatest(tenant, entity, key, "restore", null, "approved", actor,
    `Desde v${fromVersion}. ${String(reason)}`)]);
  return rows[0];
}

/**
 * Conexión de solo lectura que usa Axira. Reutiliza la validación de host/base/rol de las ofertas.
 * Producción: además exige AXIRA_CATALOG_ENABLED=true (sin esa variable, nada cambia).
 * Preview: exige AXIRA_CATALOG_QA_ENABLED=true.
 */
export function axiraCatalogReader(env = process.env) {
  if (env.VERCEL_ENV === "production" && env.AXIRA_CATALOG_ENABLED !== "true") return null;
  if (env.VERCEL_ENV === "preview" && env.AXIRA_CATALOG_QA_ENABLED !== "true") return null;
  if (env.VERCEL_ENV !== "production" && env.VERCEL_ENV !== "preview") return null;
  return neonCatalogDb(commercialOffersDatabase(env));
}

export function catalogDbFromUrl(url) {
  return url ? neonCatalogDb(neon(url, { fetchOptions: { signal: AbortSignal.timeout(5000) } })) : null;
}
