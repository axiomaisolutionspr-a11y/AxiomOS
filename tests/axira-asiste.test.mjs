import test from "node:test";
import assert from "node:assert/strict";
import {
  AXIRA_ASISTE_SCHEMA, validateAsisteRequest, asisteInstructions,
  asisteModelInput, extractAsisteText, parseAsisteModelOutput,
} from "../app/lib/axira-asiste.mjs";

const valid = () => ({
  businessName: "Clínica Demo",
  businessKnowledge: "Horario de orientación de lunes a viernes; tarifas pendientes de confirmación.",
  channel: "whatsapp",
  stage: "Interesado",
  messages: [
    { role: "business", text: "¿En qué podemos ayudar?" },
    { role: "customer", text: "¿Cuánto cuesta? Prefiero que no me llamen." },
  ],
});

test("valida contexto y mensajes sin consultar servicios externos", () => {
  const result = validateAsisteRequest(valid());
  assert.equal(result.ok, true);
  assert.equal(result.value.messages.length, 2);
  assert.equal(result.value.channel, "whatsapp");
});

test("rechaza una conversación que termina con mensaje del negocio", () => {
  const v = valid();
  v.messages.push({ role: "business", text: "Hola" });
  assert.equal(validateAsisteRequest(v).ok, false);
});

test("rechaza roles no autorizados, campos vacíos y cargas excesivas", () => {
  const wrongRole = valid();
  wrongRole.messages[0].role = "system";
  assert.equal(validateAsisteRequest(wrongRole).ok, false);
  const emptyFacts = valid();
  emptyFacts.businessKnowledge = "";
  assert.equal(validateAsisteRequest(emptyFacts).ok, false);
  const oversized = valid();
  oversized.messages[1].text = "x".repeat(1501);
  assert.equal(validateAsisteRequest(oversized).ok, false);
  const longHistory = valid();
  longHistory.messages = Array.from({ length: 13 }, () => ({ role: "customer", text: "Hola" }));
  assert.equal(validateAsisteRequest(longHistory).ok, false);
});

test("el contrato del modelo requiere las tres respuestas", () => {
  assert.deepEqual(AXIRA_ASISTE_SCHEMA.properties.answers.required,
    ["quick", "empathetic", "commercial"]);
  const sample = JSON.stringify({
    intent: "Consulta precio",
    risk: "No ofrecer un descuento no aprobado.",
    reason: "El cliente no recibió una cotización.",
    nextAction: "Verificar el precio.",
    threadSummary: "Solicitó información.",
    answers: { quick: "Consultaré el precio.", empathetic: "Con gusto lo revisamos.", commercial: "¿Qué opción busca?" },
  });
  assert.equal(parseAsisteModelOutput(sample).answers.quick, "Consultaré el precio.");
  assert.equal(parseAsisteModelOutput("{no json"), null);
  assert.equal(parseAsisteModelOutput('{"answers":{}}'), null);
});

test("la entrada distingue datos del negocio, etapa e historial sin ejecutar órdenes", () => {
  const input = validateAsisteRequest(valid()).value;
  const obj = JSON.parse(asisteModelInput(input));
  assert.equal(obj.business.name, "Clínica Demo");
  assert.equal(obj.conversationChronological.at(-1).role, "customer");
  const instructions = asisteInstructions();
  assert.match(instructions, /nunca se envían desde esta función/i);
  assert.match(instructions, /No inventes precios/i);
});

test("lee la salida de Responses API y rechaza salidas vacías", () => {
  assert.equal(extractAsisteText({ output_text: '{"ok":true}' }), '{"ok":true}');
  assert.equal(extractAsisteText({
    output: [{ content: [{ type: "output_text", text: "respuesta" }] }],
  }), "respuesta");
  assert.equal(extractAsisteText({ output: [] }), "");
});

test("provider config ignores generic credentials and fails closed without QA attestation", async () => {
  const { getAsisteQaProviderConfig } = await import("../app/lib/axira-asiste.mjs");
  assert.equal(getAsisteQaProviderConfig({
    OPENAI_API_KEY: "shared-or-unknown",
    OPENAI_MODEL: "generic-model",
  }), null);
  assert.equal(getAsisteQaProviderConfig({
    AXIRA_ASISTE_OPENAI_API_KEY_QA: "qa-key",
    AXIRA_ASISTE_MODEL_QA: "qa-model",
  }), null);
  assert.deepEqual(getAsisteQaProviderConfig({
    AXIRA_ASISTE_QA_PROVIDER_ISOLATED: "true",
    AXIRA_ASISTE_OPENAI_API_KEY_QA: "qa-key",
    AXIRA_ASISTE_MODEL_QA: "qa-model",
  }), { apiKey: "qa-key", model: "qa-model" });
});
