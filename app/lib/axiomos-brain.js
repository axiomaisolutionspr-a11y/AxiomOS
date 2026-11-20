// Brain dentro del CRM: asistente de IA del dueño del negocio, con límite mensual de preguntas.
// - El límite sale del catálogo PUBLICADO: preguntas del plan + (paquetes activos × preguntas del paquete).
// - El conteo es atómico en la base (no se puede pasar del límite aunque lleguen dos preguntas a la vez).
// - No se guarda el texto de las preguntas ni de las respuestas: solo el conteo y de dónde salió la respuesta.
// - Respuestas sin IA: datos del CRM, Centro Comercial y conocimiento aprobado. Si no hay respuesta, no se cobra.
import { answerFromCatalog, isLive, money, normalize, relevantKnowledge } from "./axira-catalog-policy.js";

export const BRAIN_PACK_KEY = "paquete-preguntas-brain";
export const BRAIN_DEFAULT_PLAN = "axiomos-gratis";
export const BRAIN_PLAN_KEYS = ["axiomos-gratis", "axiomos-autopilot", "axiomos-pro"];
export const BRAIN_MAX_QUESTION = 600;
const KEY_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

/** Mes actual en hora de Puerto Rico, AAAA-MM. */
export function brainPeriod(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Puerto_Rico", year: "numeric", month: "2-digit" }).formatToParts(new Date(now));
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}

const brainLimit = (item) => (Number.isInteger(item?.limits?.brain_questions) && item.limits.brain_questions >= 0 ? item.limits.brain_questions : null);
const liveItems = (catalog, now) => (catalog?.status === "ok" ? catalog.items.filter((i) => isLive(i, now)) : []);

/**
 * Cuántas preguntas tiene el negocio este mes, según su plan y paquetes, usando solo el catálogo publicado.
 * @param {any} catalog
 * @param {{ plan_key?: string, addon_packs?: number }} [account]
 * @param {number} [now]
 * @returns {{ available: boolean, plan: { key: string, name: string, questions: number } | null,
 *   pack: { key: string, version: number, name: string, questions: number, price_cents: number } | null, packs: number, limit: number,
 *   upgrades: Array<{ key: string, name: string, questions: number, regular_cents: number | null, promo_cents: number | null, promo_months: number | null }> }}
 */
export function brainAllowance(catalog, account = {}, now = Date.now()) {
  const items = liveItems(catalog, now);
  const planKey = KEY_RE.test(String(account.plan_key ?? "")) ? account.plan_key : BRAIN_DEFAULT_PLAN;
  const plan = items.find((i) => i.key === planKey && brainLimit(i) !== null) ?? items.find((i) => i.key === BRAIN_DEFAULT_PLAN && brainLimit(i) !== null) ?? null;
  const pack = items.find((i) => i.key === BRAIN_PACK_KEY && brainLimit(i) > 0) ?? null;
  const packs = Math.max(0, Math.min(50, Number(account.addon_packs) || 0));
  const base = plan ? brainLimit(plan) : 0;
  const packQuestions = pack ? brainLimit(pack) : 0;
  const upgrades = items.filter((i) => i.kind === "plan" && i.pricing_mode === "fixed" && brainLimit(i) > base)
    .sort((a, b) => brainLimit(a) - brainLimit(b));
  return {
    available: Boolean(plan),
    plan: plan ? { key: plan.key, name: plan.name, questions: base } : null,
    pack: pack ? { key: pack.key, version: pack.version, name: pack.name, questions: packQuestions, price_cents: pack.regular_cents } : null,
    packs,
    limit: base + packs * packQuestions,
    upgrades: upgrades.map((i) => ({ key: i.key, name: i.name, questions: brainLimit(i), regular_cents: i.regular_cents,
      promo_cents: i.promo_cents, promo_months: i.promo_months })),
  };
}

const has = (text, re) => re.test(text);
const OFFER_WORDS = /\b(ofertas?|promociones?|promos?|offers?|promotions?|deals?)\b/;
const OFFER_STATE_WORDS = /\b(activas?|vigentes?|vencen|vence|vencer|expira\w*|borrador(?:es)?|revisar|pendientes?|mis|tengo|active|expiring|drafts?|review|my|have)\b/;
const PROSPECT_WORDS = /\b(prospectos?|leads?|clientes? potenciales?|seguimientos?|atrasad[oa]s?|follow ?ups?|overdue|interesad[oa]s?|prospects?)\b/;
const USAGE_WORDS = /\b(brain)\b.*\b(quedan?|limite|cuantas|paquete|cobr\w*|left|limit|how many|pack|charge\w*)\b|\b(cuantas preguntas|how many questions|preguntas (?:me )?quedan)\b/;

const HOWTO = [
  { re: /\b(crear|crea|creo|hago|hacer|anadir|anado|agregar|agrego|publicar|publico|nueva|create|make|add|publish|new)\b.*\b(ofertas?|promocion\w*|offers?|promotions?)\b/, es: "Para crear una oferta: ve al Panel, baja a “Crear oferta”, llena nombre, precio y fechas, y guárdala como borrador. Luego la apruebas y la publicas. Axira solo usa lo publicado.", en: "To create an offer: go to the Dashboard, scroll to “Create offer”, fill in name, price and dates, and save it as a draft. Then approve and publish it. Axira only uses published offers." },
  { re: /\b(planes?|precios?|catalogo|centro comercial|conocimiento|plans?|prices?|catalog|commercial center|knowledge)\b.*\b(cambiar|editar|actualizar|subir|change|edit|update)\b|\b(cambiar|editar|actualizar|change|edit|update)\b.*\b(planes?|precios?|catalogo|plans?|prices?|catalog)\b/, es: "Los planes, servicios y respuestas de Axira se cambian en Centro Comercial: creas un borrador con el motivo, lo apruebas y lo publicas. Cada cambio queda en la auditoría.", en: "Plans, services and Axira's answers are changed in the Commercial Center: create a draft with a reason, approve it and publish it. Every change is recorded in the audit." },
  { re: /\b(idioma|ingles|espanol|language|english|spanish)\b/, es: "Arriba a la derecha, en “Idioma”, eliges Español o English. Se guarda en este navegador.", en: "At the top right, under “Language”, choose Español or English. It's saved in this browser." },
  { re: /\b(color(?:es)?|tema|efectos?|3d|sobrio|theme|effects?)\b/, es: "Arriba a la derecha tienes “Efectos” (3D o Sobrio) y “Color” (Azul, Cian, Violeta, Esmeralda, Dorado o Claro).", en: "At the top right you have “Effects” (3D or Calm) and “Color” (Blue, Cyan, Violet, Emerald, Gold or Light)." },
  { re: /\b(bajas?|opt ?outs?|no (?:me )?escrib\w*|stop|unsubscrib\w*)\b/, es: "Las personas que pidieron no recibir mensajes se manejan en “Bajas de WhatsApp” (solo el propietario). Ahí se registran y se respetan en las campañas.", en: "People who asked not to be messaged are handled in “WhatsApp opt-outs” (owner only). They are recorded there and respected by campaigns." },
  { re: /\b(demo|demostracion|tour)\b/, es: "En “Demostración” puedes recorrer el CRM con datos de ejemplo, sin tocar nada real.", en: "In “Demo tour” you can walk through the CRM with sample data, without touching anything real." },
];

function list(items, english) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${english ? "and" : "y"} ${items.at(-1)}`;
}

function offersAnswer(offers, english) {
  if (!offers) return english ? "I can't read your offers right now." : "No pude leer tus ofertas en este momento.";
  const parts = [];
  parts.push(offers.active.length
    ? (english ? `You have ${offers.active.length} active offer${offers.active.length === 1 ? "" : "s"}: ${list(offers.active.slice(0, 4), true)}.` : `Tienes ${offers.active.length} oferta${offers.active.length === 1 ? "" : "s"} activa${offers.active.length === 1 ? "" : "s"}: ${list(offers.active.slice(0, 4), false)}.`)
    : (english ? "You have no active offers right now." : "No tienes ofertas activas ahora mismo."));
  if (offers.expiring.length) parts.push(english ? `${list(offers.expiring.slice(0, 4), true)} end${offers.expiring.length === 1 ? "s" : ""} within 72 hours.` : `${list(offers.expiring.slice(0, 4), false)} vence${offers.expiring.length === 1 ? "" : "n"} en las próximas 72 horas.`);
  if (offers.drafts.length) parts.push(english ? `${offers.drafts.length} draft${offers.drafts.length === 1 ? " is" : "s are"} waiting for review.` : `${offers.drafts.length} borrador${offers.drafts.length === 1 ? " espera" : "es esperan"} revisión.`);
  return parts.join(" ");
}

function prospectsAnswer(prospects, english) {
  if (!prospects) {
    return english
      ? "Your prospect list isn't connected in this environment yet, so I can't count them. When it's connected I'll tell you how many are new, interested, in follow-up or overdue."
      : "Tu lista de prospectos todavía no está conectada en este ambiente, así que no puedo contarlos. Cuando se conecte te diré cuántos son nuevos, interesados, en seguimiento o atrasados.";
  }
  const p = prospects;
  return english
    ? `You have ${p.total} prospects: ${p.new_count} new, ${p.interested_count} interested and ${p.followup_count} in follow-up. ${p.overdue_count} follow-ups are overdue and ${p.due_next_7_days} are due in the next 7 days.${p.overdue_count > 0 ? " I'd start with the overdue ones." : ""}`
    : `Tienes ${p.total} prospectos: ${p.new_count} nuevos, ${p.interested_count} interesados y ${p.followup_count} en seguimiento. ${p.overdue_count} seguimientos están atrasados y ${p.due_next_7_days} vencen en los próximos 7 días.${p.overdue_count > 0 ? " Yo empezaría por los atrasados." : ""}`;
}

function usageAnswer(allowance, used, english) {
  const left = Math.max(0, allowance.limit - used);
  const pack = allowance.pack;
  const plan = allowance.plan?.name ?? "—";
  return english
    ? `Your plan (${plan}) includes ${allowance.plan?.questions ?? 0} Brain questions per month${allowance.packs ? ` plus ${allowance.packs} extra pack${allowance.packs === 1 ? "" : "s"}` : ""}. You have ${left} of ${allowance.limit} left this month.${pack ? ` If you run out, you can add ${pack.questions.toLocaleString("en-US")} more questions for ${money(pack.price_cents)}/month or move to a higher plan.` : ""}`
    : `Tu plan (${plan}) incluye ${allowance.plan?.questions ?? 0} preguntas a Brain al mes${allowance.packs ? ` más ${allowance.packs} paquete${allowance.packs === 1 ? "" : "s"} adicional${allowance.packs === 1 ? "" : "es"}` : ""}. Te quedan ${left} de ${allowance.limit} este mes.${pack ? ` Si se te acaban, puedes añadir ${pack.questions.toLocaleString("es-PR")} preguntas más por ${money(pack.price_cents)} al mes o subir de plan.` : ""}`;
}

/**
 * Respuesta sin IA. Devuelve { text, source, charge }:
 * source = data | catalog | knowledge | help; charge=false cuando Brain no pudo contestar (no se cobra).
 * @param {{ message?: string, language?: string, catalog?: any, crm?: any, allowance?: any, used?: number, now?: number }} [options]
 * @returns {{ text: string, source: string, charge: boolean }}
 */
export function answerBrain({ message = "", language = "es", catalog = null, crm = {}, allowance = null, used = 0, now = Date.now() } = {}) {
  const english = language === "en";
  const text = normalize(message).replace(/[¿?¡!.,;:]/g, " ");
  if (allowance && has(text, USAGE_WORDS)) return { text: usageAnswer(allowance, used, english), source: "data", charge: true };
  if (has(text, PROSPECT_WORDS)) return { text: prospectsAnswer(crm.prospects ?? null, english), source: "data", charge: Boolean(crm.prospects) };
  if (has(text, OFFER_WORDS) && has(text, OFFER_STATE_WORDS) && crm.offers !== undefined) return { text: offersAnswer(crm.offers, english), source: "data", charge: Boolean(crm.offers) };
  const howto = HOWTO.find((h) => has(text, h.re));
  if (howto) return { text: english ? howto.en : howto.es, source: "help", charge: true };
  // "plan Pro" / "el Básico": si el dueño nombra el producto sin la marca, se usa el nombre completo.
  const padded = ` ${text.replace(/\s+/g, " ").trim()} `;
  const short = liveItems(catalog, now).filter((i) => {
    const w = normalize(i.name).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((x) => x.length >= 3 && x !== "axiomos");
    return w.length > 0 && w.length <= 2 && w.every((x) => padded.includes(` ${x} `));
  });
  const asked = short.length === 1 ? `${message} ${short[0].name}` : message;
  const priced = answerFromCatalog(catalog, { message: asked, language, channel: "web", now, maxChars: 900 });
  if (priced && priced.kind !== "unknown") {
    // El cierre de Axira ("¿Quieres que te muestre…?") es para clientes; el dueño no lo necesita.
    const reply = priced.reply.replace(/\s*(¿Quieres que te muestre[^?]*\?|Would you like me to show you[^?]*\?)\s*$/, "");
    return { text: reply, source: "catalog", charge: true };
  }
  const [entry] = relevantKnowledge(catalog, message, { language, now, limit: 1 });
  if (entry) return { text: `${entry.title}: ${entry.answer}`, source: "knowledge", charge: true };
  return {
    text: english
      ? "I can't answer that one yet. In this version Brain answers with your CRM data (offers, prospects), your plans and prices, and how to use the CRM. Open questions will be answered with AI once the provider is connected. This question wasn't counted."
      : "Esa todavía no la puedo contestar. En esta versión Brain responde con los datos de tu CRM (ofertas, prospectos), tus planes y precios, y cómo usar el CRM. Las preguntas abiertas se contestarán con IA cuando se conecte el proveedor. Esta pregunta no se contó.",
    source: "help", charge: false,
  };
}

/** Sugerencias para empezar. */
export function brainSuggestions(language = "es") {
  return language === "en"
    ? ["Which offers do I have active?", "How are my prospects doing?", "How much is the Pro plan?", "How many Brain questions do I have left?", "How do I create an offer?"]
    : ["¿Qué ofertas tengo activas?", "¿Cómo van mis prospectos?", "¿Cuánto cuesta el plan Pro?", "¿Cuántas preguntas a Brain me quedan?", "¿Cómo creo una oferta?"];
}

// ---------- Base de datos (siempre con el tenant fijado por RLS) ----------
// db = { tx(queries) } (ver neonCatalogDb en axira-catalog-store.js). Mismo patrón que inTenant allí;
// se repite aquí para que este módulo no cargue el cliente de Neon (y se pueda probar sin él).
async function inTenant(db, tenant, queries) {
  if (!KEY_RE.test(String(tenant ?? ""))) throw Object.assign(new Error("tenant inválido"), { code: "TENANT" });
  const results = await db.tx([{ text: "SELECT set_config('axiomos.tenant_id', $1, true)", params: [tenant] }, ...queries]);
  return results.slice(1).map((r) => (Array.isArray(r) ? r : r?.rows ?? []));
}

/** Plan, paquetes, uso del mes y solicitudes recientes del negocio. */
export async function readBrainState(db, tenant, period) {
  const [accounts, usage, purchases] = await inTenant(db, tenant, [
    { text: "SELECT plan_key, addon_packs FROM axiomos_commercial.brain_accounts WHERE tenant_id = $1", params: [tenant] },
    { text: "SELECT used FROM axiomos_commercial.brain_usage WHERE tenant_id = $1 AND period = $2", params: [tenant, period] },
    {
      text: `SELECT id::text, item_key, questions, price_cents, status, TO_CHAR(requested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS requested_at
        FROM axiomos_commercial.brain_purchases WHERE tenant_id = $1 ORDER BY requested_at DESC, id DESC LIMIT 5`,
      params: [tenant],
    },
  ]);
  return {
    account: accounts[0] ?? { plan_key: BRAIN_DEFAULT_PLAN, addon_packs: 0 },
    used: Number(usage[0]?.used ?? 0),
    purchases,
  };
}

/** Cuenta una pregunta solo si queda cupo. Devuelve el uso nuevo o null si ya llegó al límite. */
export async function consumeQuestion(db, tenant, period, limit, actor, source) {
  const [rows] = await inTenant(db, tenant, [{
    text: `WITH c AS (
        INSERT INTO axiomos_commercial.brain_usage (tenant_id, period, used)
        SELECT $1, $2, 1 WHERE $3::int >= 1
        ON CONFLICT (tenant_id, period) DO UPDATE SET used = brain_usage.used + 1, updated_at = statement_timestamp()
          WHERE brain_usage.used < $3::int
        RETURNING used
      ), l AS (
        INSERT INTO axiomos_commercial.brain_log (tenant_id, actor, period, answer_source) SELECT $1, $4, $2, $5 FROM c RETURNING 1
      )
      SELECT used FROM c`,
    params: [tenant, period, limit, String(actor).slice(0, 120), source],
  }]);
  return rows[0] ? Number(rows[0].used) : null;
}

/** Devuelve una pregunta (por ejemplo, si la IA falló). */
export async function refundQuestion(db, tenant, period, actor) {
  await inTenant(db, tenant, [
    { text: "UPDATE axiomos_commercial.brain_usage SET used = used - 1, updated_at = statement_timestamp() WHERE tenant_id = $1 AND period = $2 AND used > 0", params: [tenant, period] },
    { text: "INSERT INTO axiomos_commercial.brain_log (tenant_id, actor, period, answer_source) VALUES ($1, $3, $2, 'refunded')", params: [tenant, period, String(actor).slice(0, 120)] },
  ]);
}

/** Solicita un paquete adicional. Queda pendiente hasta confirmar el cobro; solo una solicitud pendiente a la vez. */
export async function requestPack(db, tenant, pack, actor) {
  if (!pack || !Number.isInteger(pack.price_cents) || !(pack.questions > 0)) throw Object.assign(new Error("paquete no disponible"), { code: "PACK" });
  const [rows] = await inTenant(db, tenant, [{
    text: `INSERT INTO axiomos_commercial.brain_purchases (tenant_id, item_key, item_version, questions, price_cents, requested_by)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM axiomos_commercial.brain_purchases WHERE tenant_id = $1 AND status = 'pending')
      RETURNING id::text`,
    params: [tenant, pack.key, pack.version, pack.questions, pack.price_cents, String(actor).slice(0, 120)],
  }]);
  return rows[0]?.id ?? null;
}

/** SOLO QA: marca como pagada una solicitud (sin cobro real) y activa el paquete. */
export async function confirmPackForTest(db, tenant, id, actor) {
  if (!/^\d{1,18}$/.test(String(id))) throw Object.assign(new Error("solicitud inválida"), { code: "ID" });
  const [rows] = await inTenant(db, tenant, [{
    text: `WITH p AS (
        UPDATE axiomos_commercial.brain_purchases SET status = 'paid', confirmed_by = $3, confirmed_at = statement_timestamp(),
          note = 'Prueba QA: sin cobro real'
        WHERE tenant_id = $1 AND id = $2::bigint AND status = 'pending' RETURNING id
      )
      INSERT INTO axiomos_commercial.brain_accounts (tenant_id, addon_packs, updated_by)
      SELECT $1, 1, $3 FROM p
      ON CONFLICT (tenant_id) DO UPDATE SET addon_packs = LEAST(brain_accounts.addon_packs + 1, 50), updated_by = EXCLUDED.updated_by, updated_at = statement_timestamp()
      RETURNING addon_packs`,
    params: [tenant, id, String(actor).slice(0, 120)],
  }]);
  return rows[0] ? Number(rows[0].addon_packs) : null;
}

/** Cancela una solicitud pendiente (no borra nada: queda como cancelada). */
export async function cancelPack(db, tenant, id, actor) {
  if (!/^\d{1,18}$/.test(String(id))) throw Object.assign(new Error("solicitud inválida"), { code: "ID" });
  const [rows] = await inTenant(db, tenant, [{
    text: `UPDATE axiomos_commercial.brain_purchases SET status = 'cancelled', confirmed_by = $3, confirmed_at = statement_timestamp()
      WHERE tenant_id = $1 AND id = $2::bigint AND status = 'pending' RETURNING id::text`,
    params: [tenant, id, String(actor).slice(0, 120)],
  }]);
  return Boolean(rows[0]);
}

/** SOLO QA: cambia el plan de prueba o reinicia la prueba (plan Gratis, sin paquetes, contador del mes en 0). */
export async function setTestPlan(db, tenant, planKey, actor, { reset = false, period = brainPeriod() } = {}) {
  if (!BRAIN_PLAN_KEYS.includes(planKey)) throw Object.assign(new Error("plan inválido"), { code: "PLAN" });
  const queries = [{
    text: `INSERT INTO axiomos_commercial.brain_accounts (tenant_id, plan_key, addon_packs, updated_by) VALUES ($1, $2, 0, $3)
      ON CONFLICT (tenant_id) DO UPDATE SET plan_key = EXCLUDED.plan_key, updated_by = EXCLUDED.updated_by, updated_at = statement_timestamp()
        ${reset ? ", addon_packs = 0" : ""}`,
    params: [tenant, planKey, String(actor).slice(0, 120)],
  }];
  if (reset) queries.push({ text: "UPDATE axiomos_commercial.brain_usage SET used = 0, updated_at = statement_timestamp() WHERE tenant_id = $1 AND period = $2", params: [tenant, period] });
  await inTenant(db, tenant, queries);
}
