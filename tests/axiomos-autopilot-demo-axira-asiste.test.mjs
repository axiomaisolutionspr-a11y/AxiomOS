import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateDemoConversation, safeDemoSuggestions, validateSuggestionOutput,
} from "../integrations/axiomos-autopilot-demo/axira-asiste-policy.mjs";

const sample = () => ({
  sector: "dealer",
  businessFacts: "Dealer ficticio: los precios y la aprobación se verifican con un vendedor.",
  messages: [{ by: "cliente", text: "Me interesa la SUV, pero ¿cuánto cuesta?" }],
});

test("acepta exclusivamente mensajes de demostración", () => {
  const r = validateDemoConversation(sample());
  assert.equal(r.ok, true);
  assert.equal(r.value.messages.length, 1);
});

test("no permite números ni correos reales", () => {
  const contact = sample();
  contact.messages[0].text = "Llama al 787-322-1234";
  assert.equal(validateDemoConversation(contact).ok, false);
  contact.messages[0].text = "Mi correo es ejemplo@empresa.com";
  assert.equal(validateDemoConversation(contact).ok, false);
  contact.messages[0].text = "Mi contacto ficticio es 787-555-0101";
  assert.equal(validateDemoConversation(contact).ok, true);
});

test("no permite datos empresariales contaminados con información real", () => {
  const data = sample();
  data.businessFacts = "Correo para contactar: ventas@example.org";
  assert.equal(validateDemoConversation(data).ok, false);
  data.businessFacts = "x".repeat(1801);
  assert.equal(validateDemoConversation(data).ok, false);
});

test("genera tres borradores con restricciones y sin enviar", () => {
  const r = safeDemoSuggestions(sample());
  assert.equal(r.ok, true);
  assert.equal(r.sent, false);
  assert.equal(r.saved, false);
  assert.equal(r.mode, "simulacion_sin_ia");
  assert.deepEqual(Object.keys(r.result.answers), ["quick", "empathetic", "commercial"]);
  assert.match(r.result.answers.quick, /confirmar el precio/);
  assert.ok(validateSuggestionOutput(r));
});

test("respeta solicitud de no recibir contacto", () => {
  const data = sample();
  data.messages = [{ by: "cliente", text: "No me contacten más, por favor." }];
  const r = safeDemoSuggestions(data);
  assert.match(r.result.risk, /No enviar más/);
  assert.match(r.result.nextAction, /no generar seguimiento/);
});

test("evita insistir después de que respondió el negocio", () => {
  const data = sample();
  data.messages.push({ by: "negocio", text: "Un vendedor confirmará el precio." });
  const r = safeDemoSuggestions(data);
  assert.match(r.result.nextAction, /Esperar al cliente/);
  assert.equal(r.sent, false);
});

test("rechaza respuestas de IA no verificadas", () => {
  assert.equal(validateSuggestionOutput({ result: { answers: {} }, sent: false, saved: false }), null);
  const good = safeDemoSuggestions(sample());
  good.sent = true;
  assert.equal(validateSuggestionOutput(good), null);
});

test("el complemento no ejecuta llamadas de red ni manipula sesiones", () => {
  const source = readFileSync(new URL("../integrations/axiomos-autopilot-demo/axira-asiste-widget.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b|\bdocument\.cookie\b|\bsendMessage\s*\(/);
  assert.match(source, /mountAxiraAsisteDemo/);
});
