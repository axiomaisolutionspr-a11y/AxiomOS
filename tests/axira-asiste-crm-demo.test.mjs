import test from "node:test";
import assert from "node:assert/strict";
import { asisteCrmDemoRequest } from "../app/lib/axira-asiste-crm-demo.mjs";

const knowledge = "Servicio demo. No podemos confirmar precios, descuentos ni citas sin consultar al equipo.";
const demoContact = () => ({
  id: "o1", company: "Óptica de demostración", channel: "WhatsApp", stage: "Interesado",
  messages: [
    { id: "2", text: "¿Cuánto vale el examen?", incoming: true },
    { id: "1", text: "Hola, gracias por escribir.", incoming: false },
  ],
});

test("usa exclusivamente la ficha del CRM demo, sin teléfonos ni credenciales", () => {
  const input = demoContact();
  input.phone = "+1 787 555 0000";
  input.notes = "Notas internas no destinadas a la IA";
  const result = asisteCrmDemoRequest(input, knowledge);
  assert.equal(result.ok, true);
  assert.equal(result.value.businessName, input.company);
  assert.deepEqual(result.value.messages, [
    { role: "business", text: "Hola, gracias por escribir." },
    { role: "customer", text: "¿Cuánto vale el examen?" },
  ]);
  assert.ok(!JSON.stringify(result.value).includes(input.phone));
  assert.ok(!JSON.stringify(result.value).includes(input.notes));
});

test("rechaza registros reales aunque contengan conversaciones", () => {
  const input = demoContact();
  input.company = "Óptica Comercial";
  assert.equal(asisteCrmDemoRequest(input, knowledge).ok, false);
  input.company = "Óptica de demostración";
  input.channel = "Llamada";
  assert.equal(asisteCrmDemoRequest(input, knowledge).ok, false);
});

test("no sugiere otra respuesta cuando el último mensaje fue del negocio", () => {
  const input = demoContact();
  input.messages.unshift({ id: "3", text: "Confirmaremos el precio.", incoming: false });
  const result = asisteCrmDemoRequest(input, knowledge);
  assert.equal(result.ok, false);
  assert.match(result.error, /No hay un mensaje nuevo/);
});

test("falla cerrado ante historial o conocimiento inválido", () => {
  const input = demoContact();
  assert.equal(asisteCrmDemoRequest(input, " ").ok, false);
  input.messages = [];
  assert.equal(asisteCrmDemoRequest(input, knowledge).ok, false);
  input.messages = [{ text: "x".repeat(1501), incoming: true }];
  assert.equal(asisteCrmDemoRequest(input, knowledge).ok, false);
});

test("limita la información al máximo de 12 mensajes", () => {
  const input = demoContact();
  input.messages = Array.from({ length: 15 }, (_, i) => ({
    id: String(i), text: "Mensaje " + String(i), incoming: true,
  }));
  const result = asisteCrmDemoRequest(input, knowledge);
  assert.equal(result.ok, true);
  assert.equal(result.value.messages.length, 12);
});
