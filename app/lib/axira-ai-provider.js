/**
 * Capa de proveedores de IA para Axira (AxiomOS Brain).
 *
 * Objetivo: desacoplar /api/brain de un único proveedor (OpenAI) sin cambiar
 * el comportamiento productivo actual.
 *
 * Reglas de seguridad incorporadas:
 * - Por defecto el proveedor es "openai" (comportamiento idéntico al actual).
 * - En VERCEL_ENV=production solo se usa un proveedor distinto de OpenAI si
 *   AXIRA_AI_PRODUCTION_SWITCH_APPROVED === "true" (autorización expresa).
 * - No hay nombres de modelo inventados: Anthropic y Gemini requieren
 *   ANTHROPIC_MODEL / GEMINI_MODEL configurados; si faltan, el proveedor se
 *   considera no disponible y se usa el respaldo.
 * - Respaldo opcional (AXIRA_AI_FALLBACK_PROVIDER) ante error de red/5xx/429.
 * - Nunca se registran claves ni el contenido de los mensajes.
 */

export const SUPPORTED_PROVIDERS = ["openai", "anthropic", "gemini"];

const OPENAI_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Límite superior de tokens de salida, independiente de lo que pida la ruta (control de costos). */
const DEFAULT_MAX_OUTPUT_CAP = 2000;

function normalizeProvider(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return SUPPORTED_PROVIDERS.includes(v) ? v : null;
}

/**
 * Decide qué proveedor y respaldo usar a partir de las variables de entorno.
 * @param {Record<string, string | undefined>} env
 */
export function resolveProviderConfig(env = {}) {
  const requested = normalizeProvider(env.AXIRA_AI_PROVIDER) ?? "openai";
  const isProduction = env.VERCEL_ENV === "production";
  const productionApproved = env.AXIRA_AI_PRODUCTION_SWITCH_APPROVED === "true";

  let primary = requested;
  let reason = "configured";
  if (isProduction && requested !== "openai" && !productionApproved) {
    primary = "openai";
    reason = "production_switch_not_approved";
  }

  let fallback = normalizeProvider(env.AXIRA_AI_FALLBACK_PROVIDER);
  if (fallback === primary) fallback = null;
  if (isProduction && fallback && fallback !== "openai" && !productionApproved) fallback = null;

  const cap = Number.parseInt(env.AXIRA_AI_MAX_OUTPUT_TOKENS_CAP ?? "", 10);
  const maxOutputCap = Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_MAX_OUTPUT_CAP;

  return { primary, fallback, reason, maxOutputCap };
}

/** Devuelve {apiKey, model} del proveedor o null si no está completamente configurado. */
export function providerCredentials(provider, env = {}) {
  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) return null;
    return { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || "gpt-5.6-luna" };
  }
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY || !env.ANTHROPIC_MODEL) return null;
    return { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL };
  }
  if (provider === "gemini") {
    if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) return null;
    return { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL };
  }
  return null;
}

/**
 * Anthropic y Gemini exigen que la conversación empiece por el usuario y que
 * los turnos alternen. Se fusionan turnos consecutivos del mismo rol.
 * @param {{role: "user"|"assistant", content: string}[]} input
 */
export function toAlternatingTurns(input) {
  const turns = [];
  for (const item of Array.isArray(input) ? input : []) {
    const role = item?.role === "assistant" ? "assistant" : "user";
    const text = typeof item?.content === "string" ? item.content.trim() : "";
    if (!text) continue;
    if (turns.length === 0 && role === "assistant") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += "\n\n" + text;
    else turns.push({ role, content: text });
  }
  return turns;
}

function buildRequest(provider, creds, req, maxTokens) {
  if (provider === "openai") {
    return {
      url: OPENAI_URL,
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: {
        model: creds.model,
        instructions: req.instructions,
        input: req.input,
        ...(req.effort ? { reasoning: { effort: req.effort } } : {}),
        max_output_tokens: maxTokens,
      },
    };
  }
  if (provider === "anthropic") {
    return {
      url: ANTHROPIC_URL,
      headers: {
        "x-api-key": creds.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: {
        model: creds.model,
        max_tokens: maxTokens,
        system: req.instructions,
        messages: toAlternatingTurns(req.input),
      },
    };
  }
  // gemini
  return {
    url: `${GEMINI_BASE}/${encodeURIComponent(creds.model)}:generateContent`,
    headers: { "x-goog-api-key": creds.apiKey, "Content-Type": "application/json" },
    body: {
      systemInstruction: { parts: [{ text: req.instructions }] },
      contents: toAlternatingTurns(req.input).map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    },
  };
}

/** Extrae el texto de la respuesta de cada proveedor. */
export function extractText(provider, data) {
  if (!data || typeof data !== "object") return "";
  if (provider === "openai") {
    if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
    const pieces = [];
    for (const item of Array.isArray(data.output) ? data.output : []) {
      for (const part of Array.isArray(item?.content) ? item.content : []) {
        if (part?.type === "output_text" && typeof part.text === "string") pieces.push(part.text);
      }
    }
    return pieces.join("\n").trim();
  }
  if (provider === "anthropic") {
    const parts = Array.isArray(data.content) ? data.content : [];
    return parts.filter((p) => p?.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n").trim();
  }
  if (provider === "gemini") {
    const parts = data.candidates?.[0]?.content?.parts;
    return (Array.isArray(parts) ? parts : []).map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
  }
  return "";
}

function errorCodeOf(provider, data) {
  if (!data || typeof data !== "object") return undefined;
  if (provider === "openai") return data.error?.code || data.error?.type;
  if (provider === "anthropic") return data.error?.type;
  if (provider === "gemini") return data.error?.status;
  return undefined;
}

/** Errores en los que tiene sentido intentar el proveedor de respaldo. */
function isRetryable(status) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

async function callProvider(provider, creds, req, maxTokens, fetchImpl) {
  const started = Date.now();
  const { url, headers, body } = buildRequest(provider, creds, req, maxTokens);
  let res;
  try {
    res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), signal: req.signal });
  } catch (error) {
    if (error && error.name === "AbortError") throw error; // el timeout de la ruta manda
    return { ok: false, provider, model: creds.model, status: 0, errorCode: "network_error", latencyMs: Date.now() - started, raw: null };
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  const latencyMs = Date.now() - started;
  if (!res.ok) {
    return { ok: false, provider, model: creds.model, status: res.status, errorCode: errorCodeOf(provider, data), latencyMs, raw: data };
  }
  const text = extractText(provider, data);
  return text
    ? { ok: true, provider, model: creds.model, status: res.status, text, latencyMs, raw: data }
    : { ok: false, provider, model: creds.model, status: 502, errorCode: "empty_output", latencyMs, raw: data };
}

/**
 * Genera la respuesta de Axira con el proveedor configurado.
 * @param {{instructions: string, input: {role: string, content: string}[], maxOutputTokens: number, effort?: string, signal?: AbortSignal}} req
 * @param {{env?: Record<string, string|undefined>, fetchImpl?: typeof fetch, log?: (event: object) => void}} [options]
 */
export async function generateAxiraReply(req, options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.log ?? ((event) => console.info("axira_ai", JSON.stringify(event)));
  const config = resolveProviderConfig(env);
  const maxTokens = Math.min(Math.max(1, Number(req.maxOutputTokens) || 1), config.maxOutputCap);

  const attempts = [config.primary, config.fallback].filter(Boolean);
  let last = null;
  for (const provider of attempts) {
    const creds = providerCredentials(provider, env);
    if (!creds) {
      last = { ok: false, provider, model: null, status: 503, errorCode: "provider_not_configured", latencyMs: 0, raw: null };
      log({ provider, outcome: "not_configured", reason: config.reason });
      continue;
    }
    const result = await callProvider(provider, creds, req, maxTokens, fetchImpl);
    // Observabilidad sin datos sensibles: proveedor, modelo, estado, latencia.
    log({ provider, model: creds.model, status: result.status, ok: result.ok, errorCode: result.errorCode, latencyMs: result.latencyMs, reason: config.reason });
    if (result.ok) return { ...result, fallbackUsed: provider !== config.primary };
    last = { ...result, retryable: isRetryable(result.status) };
    // Se intenta el respaldo ante cualquier fallo: la disponibilidad de Axira
    // en WhatsApp/Messenger es prioritaria frente a un error de un proveedor.
  }
  return { ...(last ?? { ok: false, provider: null, model: null, status: 503, errorCode: "no_provider", latencyMs: 0, raw: null }), fallbackUsed: false };
}
