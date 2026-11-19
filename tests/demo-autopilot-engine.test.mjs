// Pruebas del motor Autopilot v3 del DEMO comercial (sin red, sin base de datos).
// Ejecutar: node --test tests/demo-autopilot-engine.test.mjs  (Node 22.18+ elimina los tipos de .ts)
import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeLead, assignSeller, decide, defaultPlaybook, draftReply, isDuplicateReply,
  pipelineMetrics, planActions, sanitizePlaybook, searchLeads, suggestedStage, SELLERS, productivity,
} from "../app/demo-comercial/autopilot-engine.ts";

const NOW = Date.parse("2026-11-19T20:00:00Z");
const hoursAgo = h => new Date(NOW - h * 3600_000).toISOString();
const msg = (by, text, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, by, text });
function lead(over = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111", industry: "dealer", name: "Andrea Rivera (ficticia)",
    contact: "787-555-0101", need: "Me interesa financiamiento y una prueba de manejo.",
    channel: "WhatsApp (simulado)", status: "Nuevo", priority: "Alta", nextAction: "Coordinar",
    messages: [msg("cliente", "Hola, quiero financiamiento y prueba de manejo", 1), msg("axira", "Con gusto", 2)],
    created: hoursAgo(0.2), ...over,
  };
}

test("puntuación explicable y acotada 0–100", () => {
  const a = analyzeLead(lead(), NOW);
  assert.ok(a.score > 50 && a.score <= 100, `score ${a.score}`);
  assert.ok(a.intents.some(i => i.key === "financiamiento"));
  assert.ok(a.intents.some(i => i.key === "prueba"));
  assert.ok(a.reasons.length >= 3);
  assert.equal(a.stale, false);
});

test("detecta acentos y mayúsculas al buscar intención", () => {
  const a = analyzeLead(lead({ need: "¿CUÁNTO CUESTA?", messages: [msg("cliente", "Quiero una CITA", 1)] }), NOW);
  assert.ok(a.intents.some(i => i.key === "precio"));
  assert.ok(a.intents.some(i => i.key === "cita"));
});

test("prospecto olvidado: supera SLA de su etapa", () => {
  const a = analyzeLead(lead({ status: "Contactar", created: hoursAgo(30) }), NOW);
  assert.equal(a.stale, true);
  assert.match(a.slaLabel, /Atrasado/);
});

test("sentimiento en riesgo baja la puntuación y fuerza transferencia a humano", () => {
  const l = lead({ messages: [msg("cliente", "Nadie me ha contestado, estoy molesto", 1)] });
  const a = analyzeLead(l, NOW);
  assert.equal(a.sentiment, "en riesgo");
  assert.equal(a.awaitingReply, true);
  const plan = planActions({ lead: l, analysis: a, playbook: defaultPlaybook(), mode: "supervisado", seller: SELLERS[0], now: NOW });
  assert.ok(plan.some(p => p.kind === "transferir_humano"));
  assert.match(draftReply(l, a), /persona de nuestro equipo/);
});

test("Ganado: puntuación 100 y sin plan de acciones", () => {
  const l = lead({ status: "Ganado" });
  const a = analyzeLead(l, NOW);
  assert.equal(a.score, 100);
  assert.deepEqual(planActions({ lead: l, analysis: a, playbook: defaultPlaybook(), mode: "autonomo", seller: SELLERS[0], now: NOW }), []);
});

test("política: cobros y envíos externos siempre bloqueados, en cualquier modo", () => {
  for (const mode of ["asistir", "supervisado", "autonomo"]) {
    assert.equal(decide("cobrar", mode, false).decision, "bloqueada");
    assert.equal(decide("enviar_mensaje", mode, false).decision, "bloqueada");
    assert.equal(decide("confirmar_cita", mode, false).decision, "bloqueada");
  }
});

test("política: modo Asistir exige aprobación incluso para tareas internas", () => {
  assert.equal(decide("asignar_vendedor", "asistir", false).decision, "requiere_aprobacion");
  assert.equal(decide("asignar_vendedor", "supervisado", false).decision, "ejecutada");
  assert.equal(decide("avanzar_etapa", "supervisado", false).decision, "requiere_aprobacion");
  assert.equal(decide("avanzar_etapa", "autonomo", false).decision, "ejecutada");
  assert.equal(decide("avanzar_etapa", "autonomo", true).decision, "requiere_aprobacion");
});

test("flujo guardado no puede quitar la aprobación del borrador de respuesta", () => {
  const tampered = { steps: defaultPlaybook().steps.map(s => ({ ...s, requireApproval: false })) };
  const pb = sanitizePlaybook(tampered);
  assert.equal(pb.steps.find(s => s.kind === "borrador_respuesta").requireApproval, true);
  assert.deepEqual(sanitizePlaybook("basura"), defaultPlaybook());
});

test("pasos desactivados no generan acciones", () => {
  const l = lead();
  const pb = defaultPlaybook();
  pb.steps = pb.steps.map(s => s.kind === "asignar_vendedor" ? { ...s, enabled: false } : s);
  const plan = planActions({ lead: l, analysis: analyzeLead(l, NOW), playbook: pb, mode: "supervisado", seller: SELLERS[0], now: NOW });
  assert.ok(!plan.some(p => p.kind === "asignar_vendedor"));
  assert.ok(plan.some(p => p.kind === "clasificar"));
});

test("asignación por especialidad y menor carga, estable", () => {
  const optica = lead({ id: "22222222-2222-4222-8222-222222222222", industry: "optica" });
  assert.equal(assignSeller(optica, {}).id, "s3");
  const d = lead();
  assert.equal(assignSeller(d, { x: "s1" }).id, "s2");
  assert.equal(assignSeller(d, { [d.id]: "s1" }).id, "s1", "conserva la asignación existente");
});

test("prevención de respuestas duplicadas", () => {
  const l = lead();
  const a = analyzeLead(l, NOW);
  const draft = draftReply(l, a);
  assert.equal(isDuplicateReply(l, draft), false);
  assert.equal(isDuplicateReply(l, draft, [draft]), true);
  const l2 = lead({ messages: [...l.messages, msg("axira", draft.toUpperCase(), 3), msg("cliente", "ok", 4)] });
  assert.equal(isDuplicateReply(l2, draft), true);
  const plan = planActions({ lead: l2, analysis: analyzeLead(l2, NOW), playbook: defaultPlaybook(), mode: "supervisado", seller: SELLERS[0], now: NOW });
  assert.ok(!plan.some(p => p.kind === "borrador_respuesta"), "no propone repetir lo mismo");
});

test("Ganado nunca se propone automáticamente", () => {
  for (const status of ["Nuevo", "Contactar", "Cita solicitada"]) {
    const l = lead({ status });
    assert.notEqual(suggestedStage(l, analyzeLead(l, NOW)), "Ganado");
  }
});

test("búsqueda en historial sin acentos", () => {
  const leads = [lead(), lead({ id: "33333333-3333-4333-8333-333333333333", name: "Luis (ficticio)", messages: [msg("cliente", "Opción vegetariana", 1)] })];
  assert.equal(searchLeads(leads, "vegetariana").length, 1);
  assert.equal(searchLeads(leads, "OPCION").length, 1);
  assert.equal(searchLeads(leads, "").length, 2);
});

test("métricas: embudo, conversión por canal y carga por vendedor, sin datos inventados", () => {
  const a = lead();
  const b = lead({ id: "44444444-4444-4444-8444-444444444444", status: "Ganado" });
  const c = lead({ id: "55555555-5555-4555-8555-555555555555", channel: "Instagram (simulado)", industry: "restaurant", status: "Contactar", created: hoursAgo(40) });
  const m = pipelineMetrics([a, b, c], NOW, { [a.id]: "s1", [c.id]: "s2" });
  assert.equal(m.total, 3);
  assert.equal(m.byStatus.find(s => s.status === "Ganado").count, 1);
  const wa = m.byChannel.find(x => x.channel === "WhatsApp (simulado)");
  assert.equal(wa.total, 2); assert.equal(wa.won, 1); assert.equal(wa.rate, 0.5);
  assert.equal(m.stale, 1);
  assert.equal(m.sellerLoad.find(s => s.seller.id === "s1").open, 1);
  assert.equal(pipelineMetrics([], NOW, {}).avgScore, 0);
});

test("productividad de Axira se calcula solo del registro real", () => {
  const p = productivity([
    { leadId: "a", outcome: "ejecutada" }, { leadId: "a", outcome: "aprobada" },
    { leadId: "b", outcome: "bloqueada" }, { leadId: "b", outcome: "descartada" },
  ]);
  assert.deepEqual(p, { executed: 1, approved: 1, discarded: 1, blocked: 1, leadsTouched: 2 });
});
