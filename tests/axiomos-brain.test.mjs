import test from "node:test";
import assert from "node:assert/strict";
import { answerBrain, brainAllowance, brainPeriod } from "../app/lib/axiomos-brain.js";

const live = { valid_from: "2026-01-01T00:00:00.000Z", valid_until: null, channels: ["whatsapp", "messenger", "instagram", "web"] };
const plan = (key, name, regular, brain, extra = {}) => ({ ...live, key, version: 1, kind: "plan", name, pricing_mode: "fixed", billing_period: "month",
  regular_cents: regular, promo_cents: null, promo_months: null, users_included: 2, limits: { brain_questions: brain }, ...extra });
const catalog = {
  status: "ok",
  items: [
    plan("axiomos-gratis", "AxiomOS Gratis", 0, 20),
    plan("axiomos-autopilot", "AxiomOS Básico", 1795, 100, { promo_cents: 999, promo_months: 3 }),
    plan("axiomos-pro", "AxiomOS Pro", 2999, 500, { users_included: 3 }),
    { ...live, key: "paquete-preguntas-brain", version: 1, kind: "service", name: "Paquete de 1,000 preguntas a Brain", pricing_mode: "fixed",
      billing_period: "month", regular_cents: 499, promo_cents: null, promo_months: null, users_included: null, limits: { brain_questions: 1000 } },
  ],
  knowledge: [{ ...live, key: "brain-vs-axira", topic: "product", language: "es", title: "Diferencia entre Axira y Brain",
    answer: "Axira atiende a tus clientes; Brain te ayuda a ti.", keywords: ["diferencia", "axira"] }],
};

test("el mes se calcula en hora de Puerto Rico", () => {
  assert.equal(brainPeriod(Date.parse("2026-12-01T03:00:00Z")), "2026-11"); // 11:00 p. m. del 30-nov en PR
  assert.equal(brainPeriod(Date.parse("2026-12-01T05:00:00Z")), "2026-12");
});

test("límite = plan + paquetes, solo desde el catálogo publicado", () => {
  assert.equal(brainAllowance(catalog, {}).limit, 20);
  assert.equal(brainAllowance(catalog, { plan_key: "axiomos-autopilot" }).limit, 100);
  const pro = brainAllowance(catalog, { plan_key: "axiomos-pro", addon_packs: 2 });
  assert.equal(pro.limit, 2500);
  assert.equal(pro.pack.price_cents, 499);
  assert.deepEqual(brainAllowance(catalog, {}).upgrades.map((u) => u.key), ["axiomos-autopilot", "axiomos-pro"]);
  assert.equal(brainAllowance(catalog, { plan_key: "no-existe" }).plan.key, "axiomos-gratis");
  assert.equal(brainAllowance({ status: "unavailable", items: [], knowledge: [] }, {}).limit, 0);
  const archived = { ...catalog, items: catalog.items.map((i) => i.key === "paquete-preguntas-brain" ? { ...i, valid_until: "2026-01-02T00:00:00.000Z" } : i) };
  assert.equal(brainAllowance(archived, { addon_packs: 3 }).limit, 20);
});

test("responde con datos del CRM, precios y ayuda; lo que no sabe no se cobra", () => {
  const crm = { offers: { active: ["Promo Navidad"], drafts: ["Borrador A"], expiring: ["Promo Navidad"] }, prospects: null };
  const allowance = brainAllowance(catalog, {});
  const offers = answerBrain({ message: "¿Qué ofertas tengo activas?", catalog, crm, allowance });
  assert.equal(offers.source, "data");
  assert.match(offers.text, /1 oferta activa: Promo Navidad/);
  assert.match(offers.text, /vence en las próximas 72 horas/);

  const prospects = answerBrain({ message: "¿Cómo van mis prospectos?", catalog, crm, allowance });
  assert.equal(prospects.charge, false);
  assert.match(prospects.text, /no está conectada/);
  const withData = answerBrain({ message: "cuantos seguimientos atrasados tengo", catalog, allowance,
    crm: { prospects: { total: 40, new_count: 5, interested_count: 10, followup_count: 8, overdue_count: 3, due_next_7_days: 4 } } });
  assert.equal(withData.charge, true);
  assert.match(withData.text, /3 seguimientos están atrasados/);

  const pro = answerBrain({ message: "¿Cuánto cuesta el plan Pro?", catalog, crm, allowance });
  assert.equal(pro.source, "catalog");
  assert.match(pro.text, /AxiomOS Pro cuesta \$29\.99 al mes/);
  assert.match(pro.text, /500 preguntas a Brain al mes/);
  assert.doesNotMatch(pro.text, /Quieres que te muestre/);

  const usage = answerBrain({ message: "¿Cuántas preguntas a Brain me quedan?", catalog, crm, allowance, used: 7 });
  assert.match(usage.text, /Te quedan 13 de 20/);
  assert.match(usage.text, /\$4\.99/);

  const howto = answerBrain({ message: "¿Cómo creo una oferta?", catalog, crm, allowance });
  assert.equal(howto.source, "help");
  assert.equal(howto.charge, true);

  const unknown = answerBrain({ message: "Escríbeme un poema", catalog, crm, allowance });
  assert.equal(unknown.charge, false);

  const english = answerBrain({ message: "How much is the Pro plan?", language: "en", catalog, crm, allowance });
  assert.match(english.text, /AxiomOS Pro costs \$29\.99\/month/);
});
