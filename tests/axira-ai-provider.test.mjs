import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveProviderConfig,
  providerCredentials,
  toAlternatingTurns,
  extractText,
  generateAxiraReply,
} from "../app/lib/axira-ai-provider.js";

const silent = () => {};
const req = {
  instructions: "Eres Axira.",
  input: [
    { role: "assistant", content: "Saludo previo" },
    { role: "user", content: "Hola" },
    { role: "user", content: "¿Qué ofrecen?" },
    { role: "assistant", content: "Automatización." },
    { role: "user", content: "Gracias" },
  ],
  maxOutputTokens: 500,
};

function mockFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.body };
  };
  return { impl, calls };
}

test("default provider is openai (no behaviour change)", () => {
  assert.equal(resolveProviderConfig({}).primary, "openai");
  assert.equal(resolveProviderConfig({ AXIRA_AI_PROVIDER: "desconocido" }).primary, "openai");
});

test("production refuses non-OpenAI provider without explicit approval", () => {
  const c = resolveProviderConfig({ VERCEL_ENV: "production", AXIRA_AI_PROVIDER: "anthropic", AXIRA_AI_FALLBACK_PROVIDER: "gemini" });
  assert.equal(c.primary, "openai");
  assert.equal(c.fallback, null);
  assert.equal(c.reason, "production_switch_not_approved");
  const ok = resolveProviderConfig({ VERCEL_ENV: "production", AXIRA_AI_PROVIDER: "anthropic", AXIRA_AI_PRODUCTION_SWITCH_APPROVED: "true" });
  assert.equal(ok.primary, "anthropic");
});

test("preview may use anthropic with openai fallback", () => {
  const c = resolveProviderConfig({ VERCEL_ENV: "preview", AXIRA_AI_PROVIDER: "anthropic", AXIRA_AI_FALLBACK_PROVIDER: "openai" });
  assert.deepEqual([c.primary, c.fallback], ["anthropic", "openai"]);
});

test("anthropic/gemini require an explicit model (no invented defaults)", () => {
  assert.equal(providerCredentials("anthropic", { ANTHROPIC_API_KEY: "k" }), null);
  assert.equal(providerCredentials("gemini", { GEMINI_API_KEY: "k" }), null);
  assert.ok(providerCredentials("anthropic", { ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "m" }));
});

test("turns start with user and alternate", () => {
  const t = toAlternatingTurns(req.input);
  assert.equal(t[0].role, "user");
  assert.deepEqual(t.map((x) => x.role), ["user", "assistant", "user"]);
  assert.equal(t[0].content, "Hola\n\n¿Qué ofrecen?");
});

test("extracts text from each provider format", () => {
  assert.equal(extractText("openai", { output: [{ content: [{ type: "output_text", text: "A" }] }] }), "A");
  assert.equal(extractText("anthropic", { content: [{ type: "text", text: "B" }] }), "B");
  assert.equal(extractText("gemini", { candidates: [{ content: { parts: [{ text: "C" }] } }] }), "C");
});

test("anthropic request shape, header and token cap", async () => {
  const { impl, calls } = mockFetch([{ status: 200, body: { content: [{ type: "text", text: "¡Hola! Soy Axira." }] } }]);
  const env = { VERCEL_ENV: "preview", AXIRA_AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "model-x", AXIRA_AI_MAX_OUTPUT_TOKENS_CAP: "300" };
  const r = await generateAxiraReply(req, { env, fetchImpl: impl, log: silent });
  assert.equal(r.ok, true);
  assert.equal(r.text, "¡Hola! Soy Axira.");
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].init.headers["anthropic-version"], "2023-06-01");
  assert.equal(calls[0].body.max_tokens, 300);
  assert.equal(calls[0].body.system, "Eres Axira.");
  assert.equal(calls[0].body.messages[0].role, "user");
});

test("falls back to openai when primary fails", async () => {
  const { impl, calls } = mockFetch([
    { status: 529, body: { type: "error", error: { type: "overloaded_error" } } },
    { status: 200, body: { output_text: "Respuesta de respaldo" } },
  ]);
  const env = { VERCEL_ENV: "preview", AXIRA_AI_PROVIDER: "anthropic", AXIRA_AI_FALLBACK_PROVIDER: "openai", ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "m", OPENAI_API_KEY: "o" };
  const r = await generateAxiraReply(req, { env, fetchImpl: impl, log: silent });
  assert.equal(r.ok, true);
  assert.equal(r.provider, "openai");
  assert.equal(r.fallbackUsed, true);
  assert.equal(calls.length, 2);
});

test("unconfigured primary goes straight to fallback without a network call", async () => {
  const { impl, calls } = mockFetch([{ status: 200, body: { output_text: "ok" } }]);
  const env = { AXIRA_AI_PROVIDER: "gemini", AXIRA_AI_FALLBACK_PROVIDER: "openai", OPENAI_API_KEY: "o" };
  const r = await generateAxiraReply(req, { env, fetchImpl: impl, log: silent });
  assert.equal(r.provider, "openai");
  assert.equal(calls.length, 1);
});

test("network error without fallback returns a controlled failure", async () => {
  const { impl } = mockFetch([new TypeError("fetch failed")]);
  const env = { AXIRA_AI_PROVIDER: "openai", OPENAI_API_KEY: "o" };
  const r = await generateAxiraReply(req, { env, fetchImpl: impl, log: silent });
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "network_error");
});

test("logs never contain the API key or message content", async () => {
  const { impl } = mockFetch([{ status: 200, body: { output_text: "texto" } }]);
  const events = [];
  await generateAxiraReply(req, { env: { OPENAI_API_KEY: "sk-secret-value" }, fetchImpl: impl, log: (e) => events.push(JSON.stringify(e)) });
  const all = events.join(" ");
  assert.ok(!all.includes("sk-secret-value"));
  assert.ok(!all.includes("Gracias"));
});
