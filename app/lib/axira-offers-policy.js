export const OFFER_CHANNELS = ["whatsapp", "messenger", "instagram", "web"];
export const OFFER_PRODUCTS = {
  whatsapp: "WhatsApp",
  crm: "CRM",
  brain: "AxiomOS Brain",
  recepcion: "Recepción IA",
  automatizacion: "Automatización",
  publicidad: "Publicidad",
  robotica: "Robótica",
  integraciones: "Integraciones",
};

const PRODUCT_ALIASES = {
  whatsapp: ["whatsapp"], crm: ["crm", "pos"], brain: ["brain"],
  recepcion: ["recepcion", "recepcionista", "receptionist", "telefonia", "voice"],
  automatizacion: ["automatizacion", "automation"],
  publicidad: ["publicidad", "anuncio", "anuncios", "advertising", "video", "ads"],
  robotica: ["robotica", "robot", "robots", "robotics"],
  integraciones: ["integracion", "integraciones", "integration", "integrations"],
};

const PUERTO_RICO = "America/Puerto_Rico";
const MAX_MONEY = /^(?:0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/;
const normalize = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase();
const commercialWords = /\b(?:ofertas?|promocion(?:es)?|promos?|descuentos?|especiales?|precios?|tarifas?|costos?|cuesta(?:n)?|offers?|promotions?|deals?|specials?|discounts?|pric(?:e|es|ing)|costs?|how much)\b/;
const followUp = /\b(?:hasta cuando|hasta que dia|sigue(?: vigente)?|todavia|vence|vencimiento|la de|el de|still|that one|until when|expires?|when does it end)\b/;
const moneyMention = /[$€£]|\b(?:usd|d[oó]lares?|dollars?|centavos?|cents)\b|\b\d{1,6}[.,]\d{2}\b/i;

export function puertoRicoLocalDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PUERTO_RICO, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseLocalDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-04:00`);
  if (!Number.isFinite(date.getTime()) || puertoRicoLocalDateTime(date) !== value) return null;
  return date.toISOString();
}

function parseCents(value) {
  if (!MAX_MONEY.test(value)) return null;
  const [dollars, fraction = ""] = value.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export function validateOfferInput(raw) {
  const name = String(raw.name ?? "").trim();
  const product = String(raw.product ?? "");
  const start = parseLocalDateTime(String(raw.start ?? ""));
  const end = parseLocalDateTime(String(raw.end ?? ""));
  const normal = parseCents(String(raw.normal ?? "").trim());
  const promo = parseCents(String(raw.promo ?? "").trim());
  const activation = parseCents(String(raw.activation ?? "").trim());
  const tax = String(raw.tax ?? "");
  const termsEs = String(raw.termsEs ?? "").trim();
  const termsEn = String(raw.termsEn ?? "").trim();
  const externalEs = String(raw.externalEs ?? "").trim();
  const externalEn = String(raw.externalEn ?? "").trim();
  const slots = String(raw.maxClients ?? "").trim();
  const maxClients = slots === "" ? null : Number(slots);
  const channels = Array.isArray(raw.channels) ? [...new Set(raw.channels)] : [];

  if (!Object.hasOwn(OFFER_PRODUCTS, product) || name.length < 3 || name.length > 80) {
    return { ok: false, error: "Escribe un nombre válido y selecciona un servicio." };
  }
  if (normal === null || promo === null || activation === null || promo > normal) {
    return { ok: false, error: "Verifica las cantidades en USD. El precio promocional debe ser igual o menor al regular." };
  }
  if (!start || !end || start >= end) {
    return { ok: false, error: "Comprueba que el vencimiento sea posterior al inicio en hora de Puerto Rico." };
  }
  if (!channels.length || channels.some((channel) => !OFFER_CHANNELS.includes(channel))) {
    return { ok: false, error: "Selecciona al menos un canal válido." };
  }
  if (!["included", "excluded"].includes(tax) || !termsEs || termsEs.length > 120 ||
    termsEn.length > 120 || !externalEs || externalEs.length > 80 || externalEn.length > 80) {
    return { ok: false, error: "Indica el tratamiento de impuestos, el contrato y los gastos externos. Revisa los límites de texto." };
  }
  if (maxClients !== null && (!/^\d{1,5}$/.test(slots) || maxClients < 1 || maxClients > 10000)) {
    return { ok: false, error: "El máximo de clientes debe ser un entero entre 1 y 10,000." };
  }
  return {
    ok: true,
    value: { name, product, start, end, normal, promo, activation, taxIncluded: tax === "included",
      termsEs, termsEn, externalEs, externalEn, maxClients, channels },
  };
}

export function isOfferQuestion(message, history = []) {
  const normalized = normalize(message);
  return commercialWords.test(normalized) || moneyMention.test(message) ||
    (followUp.test(normalized) && history.slice(-6).some(({ text }) =>
      commercialWords.test(normalize(text)) || moneyMention.test(text)));
}

export function hasUnverifiedCommercialClaim(message) {
  const normalized = normalize(message);
  return moneyMention.test(message) ||
    /\b\d+[.,]?\d*\s*%|\b(?:precio|tarifa|price|rate|costo|cost|activacion|setup|monthly)\b.{0,32}\b\d+|\b(?:oferta|promocion|discount|promotion|deal)\b.{0,48}\b(?:vigente|valid|vence|ends|hasta|until|gratis|free)\b|\b(?:mes(?:es)? gratis|months? free|free months?|cupos? (?:disponibles?|confirmados?)|slots? available)\b/.test(normalized);
}

export function offerLanguage(explicitLanguage, message) {
  if (explicitLanguage === "en" || explicitLanguage === "es") return explicitLanguage;
  return /\b(?:what|which|how much|do you|pricing|prices?|costs?|discounts?|offers?|deals?|until|expires?)\b/i.test(message)
    ? "en" : "es";
}

export function getOfferState(offer, now = Date.now()) {
  if (offer.status !== "approved") return offer.status;
  const start = Date.parse(offer.starts_at);
  const end = Date.parse(offer.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "unavailable";
  if (end <= now) return "expired";
  if (start > now) return "scheduled";
  return "active";
}

export const offerMoney = (cents) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
}).format(cents / 100);

function offerEnd(iso, english) {
  return new Intl.DateTimeFormat(english ? "en-US" : "es-PR", {
    timeZone: PUERTO_RICO, day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * @param {{status: string, offers: Array<object>}} catalog
 * @param {{language?: string, message?: string, history?: Array<{role: string, text: string}>, maxChars?: number, now?: number}} [options]
 */
export function formatOffersReply(catalog, { language = "es", message = "", history = [], maxChars = 480, now = Date.now() } = {}) {
  const english = language === "en";
  if (catalog.status === "unavailable") {
    return english ? "I can’t verify the current offers right now. Which service can we help you with?"
      : "Ahora mismo no puedo verificar las ofertas vigentes. ¿Con qué servicio podemos ayudarte?";
  }
  const active = catalog.offers.filter((offer) => getOfferState(offer, now) === "active");
  const query = ` ${normalize(message).replace(/[^a-z0-9]+/g, " ")} `;
  const context = followUp.test(normalize(message))
    ? ` ${normalize(history.filter((item) => item.role === "user").at(-1)?.text ?? "").replace(/[^a-z0-9]+/g, " ")} `
    : "";
  const requested = Object.entries(PRODUCT_ALIASES).filter(([, aliases]) =>
    aliases.some((alias) => query.includes(` ${alias} `)));
  if (!requested.length && context) {
    requested.push(...Object.entries(PRODUCT_ALIASES).filter(([, aliases]) =>
      aliases.some((alias) => context.includes(` ${alias} `))));
  }
  const names = active.filter((offer) => query.includes(` ${normalize(offer.name).replace(/[^a-z0-9]+/g, " ")} `));
  const offers = names.length ? names : requested.length
    ? active.filter((offer) => requested.some(([key]) => key === offer.product_key)) : active;
  if (!offers.length) {
    return english ? "We have no confirmed current promotion for that request. We can prepare a quote for you."
      : "Para esa consulta no tenemos una promoción vigente confirmada. Podemos prepararte una cotización.";
  }
  if (offers.length > 1 || (!requested.length && !names.length)) {
    const list = offers.map((offer) =>
      `${OFFER_PRODUCTS[offer.product_key]} · ${english ? "ends" : "vence"} ${offerEnd(offer.ends_at, english)} (PR)`).join(". ");
    const result = english ? `${list}. Which service would you like pricing and terms for?`
      : `${list}. ¿De qué servicio quieres los precios y las condiciones?`;
    if (result.length <= maxChars) return result;
    return english ? "Which service would you like us to check pricing and terms for?"
      : "¿De qué servicio quieres que verifiquemos los precios y las condiciones?";
  }
  const [offer] = offers;
  const terms = english ? offer.terms_en : offer.terms_es;
  const external = english ? offer.external_en : offer.external_es;
  const fallback = english ? "I can confirm the full pricing and terms with our team."
    : "Podemos confirmar el precio y todas las condiciones con nuestro equipo.";
  if (!terms || !external) return fallback;

  const expiry = offerEnd(offer.ends_at, english);
  const price = offerMoney(offer.promo_cents);
  const regular = offerMoney(offer.normal_cents);
  const activation = offerMoney(offer.activation_cents);
  const tax = english ? (offer.tax_included ? "Tax included." : "Tax extra.")
    : (offer.tax_included ? "Impuestos incluidos." : "Impuestos aparte.");
  const capacity = !offer.max_clients ? "" : english ? " Availability must be confirmed." : " Cupos sujetos a confirmación.";
  const result = english
    ? `${offer.name} · ${price}/mo (regular ${regular}). Setup ${activation}. Ends ${expiry} (Puerto Rico time). ${tax} Terms. ${terms} External charges. ${external}${capacity}`
    : `${offer.name} · ${price}/mes (regular ${regular}). Activación ${activation}. Vence el ${expiry} (hora de Puerto Rico). ${tax} Condiciones. ${terms} Gastos externos. ${external}${capacity}`;
  return result.length <= maxChars ? result : fallback;
}
