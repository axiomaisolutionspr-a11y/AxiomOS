// Precios aprobados el 20-nov-2026: planes Gratis/Básico/Pro, complementos y Brain (solo QA).
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadPublishedCatalog } from "../app/lib/axira-catalog-store.js";
import { answerFromCatalog, validateItemInput, LIMIT_ENFORCEMENT } from "../app/lib/axira-catalog-policy.js";

const NOW = Date.parse("2026-11-20T20:00:00Z");
const sqlFile = (p) => readFile(new URL(`../database/${p}`, import.meta.url), "utf8");

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-precios-test-"));
  const initial = await PGlite.create({ dataDir });
  await initial.exec("CREATE DATABASE neondb");
  await initial.close();
  const db = await PGlite.create({ dataDir, database: "neondb" });
  await db.exec(`CREATE ROLE axiomos_commercial_writer NOLOGIN; CREATE ROLE axiomos_commercial_reader NOLOGIN;`);
  await db.exec(await sqlFile("migrations/20261119_axiomos_catalog_v2.sql"));
  await db.exec(await sqlFile("qa/20261119_axiomos_catalog_seed_qa.sql"));
  const reader = {
    run: async (text, params) => db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE axiomos_commercial_reader");
      return (await tx.query(text, params)).rows;
    }),
    tx: async (queries) => db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE axiomos_commercial_reader");
      const out = [];
      for (const q of queries) out.push((await tx.query(q.text, q.params ?? [])).rows);
      return out;
    }),
  };
  return { db, reader, async close() { await db.close(); await rm(dataDir, { recursive: true, force: true }); } };
}

test("Seed de precios 20-nov: publica planes y complementos, archiva la v1 y es idempotente", async () => {
  const env = await setup();
  try {
    const seed = await sqlFile("qa/20261120_axiomos_precios_planes_brain_qa.sql");
    await env.db.exec(seed);
    await env.db.exec(seed); // idempotente

    const rows = (await env.db.query(
      "SELECT item_key, version, status, regular_cents, promo_cents, limits FROM axiomos_commercial.catalog_items WHERE item_key = 'axiomos-autopilot' ORDER BY version")).rows;
    assert.deepEqual(rows.map((r) => [r.version, r.status]), [[1, "archived"], [2, "published"]]);
    assert.deepEqual(rows[1].limits, { call_minutes: 200, axira_voice_minutes: 50, axira_responses: 500, brain_questions: 100 });

    const audit = (await env.db.query(
      "SELECT action, count(*)::int AS n FROM axiomos_commercial.catalog_audit WHERE actor = 'qa-precios-20261120' GROUP BY action ORDER BY action")).rows;
    assert.deepEqual(audit, [{ action: "archive", n: 1 }, { action: "publish", n: 16 }], "11 productos + 5 conocimientos, sin duplicar al repetir");

    const catalog = await loadPublishedCatalog(env.reader, "axiomai", "whatsapp");
    const price = Object.fromEntries(catalog.items.filter((i) => i.pricing_mode === "fixed").map((i) => [i.key, i.regular_cents]));
    assert.deepEqual(
      { gratis: price["axiomos-gratis"], basico: price["axiomos-autopilot"], pro: price["axiomos-pro"], usuario: price["usuario-adicional"],
        numero: price["numero-adicional"], minutos: price["paquete-minutos-telefono"], voz: price["paquete-axira-voz"],
        respuestas: price["paquete-respuestas-axira"], brain: price["paquete-preguntas-brain"], sms: price["sms-10dlc"], registro: price["registro-sms-10dlc"] },
      { gratis: 0, basico: 1795, pro: 2999, usuario: 499, numero: 299, minutos: 799, voz: 899, respuestas: 699, brain: 499, sms: 1299, registro: 1950 });

    const basico = answerFromCatalog(catalog, { message: "¿Cuánto cuesta el plan AxiomOS Básico?", channel: "whatsapp", now: NOW });
    assert.equal(basico.kind, "price");
    assert.match(basico.reply, /\$9\.99 al mes durante tus primeros 3 meses y luego \$17\.95 mensuales/);
    assert.match(basico.reply, /200 minutos de teléfono, 50 minutos de Axira por voz, hasta 500 respuestas de Axira al mes y hasta 100 preguntas a Brain al mes/);

    const pro = answerFromCatalog(catalog, { message: "precio de AxiomOS Pro", channel: "whatsapp", now: NOW });
    assert.match(pro.reply, /AxiomOS Pro cuesta \$29\.99 al mes/);

    const gratis = answerFromCatalog(catalog, { message: "¿Cuánto cuesta AxiomOS Gratis?", channel: "whatsapp", now: NOW });
    assert.match(gratis.reply, /AxiomOS Gratis es gratuito/);

    const general = answerFromCatalog(catalog, { message: "¿Cuánto cuestan sus planes?", channel: "whatsapp", now: NOW });
    assert.match(general.reply, /AxiomOS Gratis/);
    assert.match(general.reply, /AxiomOS Básico/);
    assert.match(general.reply, /AxiomOS Pro/);
  } finally {
    await env.close();
  }
});

test("El formulario acepta minutos de Axira por voz y preguntas a Brain, y rechaza valores no enteros", () => {
  const base = { key: "axiomos-pro", kind: "plan", name: "AxiomOS Pro", pricingMode: "fixed", billingPeriod: "month", regular: "29.99",
    usersIncluded: "3", callMinutes: "500", axiraVoiceMinutes: "150", axiraResponses: "1500", brainQuestions: "500", channels: ["whatsapp"] };
  const ok = validateItemInput(base);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.limits, { call_minutes: 500, axira_voice_minutes: 150, axira_responses: 1500, brain_questions: 500 });
  assert.equal(validateItemInput({ ...base, axiraVoiceMinutes: "1.5" }).ok, false);
  assert.equal(validateItemInput({ ...base, brainQuestions: "-3" }).ok, false);
  assert.ok(LIMIT_ENFORCEMENT.axira_voice_minutes && LIMIT_ENFORCEMENT.brain_questions, "el dueño ve que no hay control técnico");
});
