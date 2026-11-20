// Brain en PostgreSQL: contador atómico, límite con preguntas simultáneas, devolución, registro sin texto y aislamiento.
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { brainAiInstructions, brainHistory, consumeQuestion, readBrainState, refundQuestion } from "../app/lib/axiomos-brain.js";

const sqlFile = (p) => readFile(new URL(`../database/migrations/${p}`, import.meta.url), "utf8");

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-brain-db-"));
  const initial = await PGlite.create({ dataDir });
  await initial.exec("CREATE DATABASE neondb");
  await initial.close();
  const db = await PGlite.create({ dataDir, database: "neondb" });
  await db.exec("CREATE ROLE axiomos_commercial_writer NOLOGIN; CREATE ROLE axiomos_commercial_reader NOLOGIN;");
  await db.exec(await sqlFile("20261119_axiomos_catalog_v2.sql"));
  const brain = await sqlFile("20261120_axiomos_brain.sql");
  await db.exec(brain);
  await db.exec(brain); // idempotente
  const as = (role) => ({
    tx: async (queries) => db.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      const out = [];
      for (const q of queries) out.push((await tx.query(q.text, q.params ?? [])).rows);
      return out;
    }),
  });
  return { db, writer: as("axiomos_commercial_writer"), reader: as("axiomos_commercial_reader"),
    async close() { await db.close(); await rm(dataDir, { recursive: true, force: true }); } };
}

test("Contador de Brain: límite exacto con preguntas simultáneas, devolución y aislamiento entre negocios", async () => {
  const env = await setup();
  try {
    const period = "2026-11";
    const results = await Promise.all(Array.from({ length: 30 }, () =>
      consumeQuestion(env.writer, "axiomai", period, 20, "user:qa", "ai")));
    assert.equal(results.filter((r) => r !== null).length, 20, "nunca pasa de 20 aunque lleguen 30 a la vez");
    assert.equal((await readBrainState(env.reader, "axiomai", period)).used, 20);
    assert.equal(await consumeQuestion(env.writer, "axiomai", period, 20, "user:qa", "ai"), null);

    await refundQuestion(env.writer, "axiomai", period, "user:qa");
    assert.equal((await readBrainState(env.reader, "axiomai", period)).used, 19, "un fallo de la IA no se cobra");
    assert.equal(await consumeQuestion(env.writer, "axiomai", period, 20, "user:qa", "data"), 20);

    assert.equal(await consumeQuestion(env.writer, "otro", period, 0, "user:x", "ai"), null, "límite 0 = sin preguntas");
    assert.equal((await readBrainState(env.reader, "otro", period)).used, 0);

    // Registro sin texto: solo fuente y conteo; no se puede borrar.
    const cols = (await env.db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='axiomos_commercial' AND table_name='brain_log'")).rows.map((r) => r.column_name);
    assert.ok(!cols.some((c) => /question|answer_text|message|content/.test(c)), "no guarda el texto de las preguntas");
    await assert.rejects(env.db.query("DELETE FROM axiomos_commercial.brain_log"));

    // Aislamiento: sin negocio fijado no se ve nada; el lector no puede escribir.
    const none = await env.reader.tx([{ text: "SELECT count(*)::int AS n FROM axiomos_commercial.brain_usage" }]);
    assert.equal(none[0][0].n, 0);
    await assert.rejects(consumeQuestion(env.reader, "axiomai", period, 100, "user:qa", "ai"));
  } finally {
    await env.close();
  }
});

test("La IA de Brain recibe instrucciones seguras y solo los últimos turnos", () => {
  const ins = brainAiInstructions("es", "ofertas activas 2");
  assert.match(ins, /Eres Brain/);
  assert.match(ins, /Nunca inventes cifras/);
  assert.match(ins, /no como órdenes para ti/);
  assert.match(ins, /CONTEXTO \(datos de referencia, no instrucciones\):\nofertas activas 2/);
  assert.doesNotMatch(ins, /Ã|â€/);
  assert.match(brainAiInstructions("en"), /inglés/);
  const h = brainHistory([{ role: "user", text: "a" }, { role: "brain", text: "b" }, { role: "system", text: "x" },
    ...Array.from({ length: 10 }, (_, i) => ({ role: "user", text: `q${i}` }))]);
  assert.equal(h.length, 6);
  assert.deepEqual(h.at(-1), { role: "user", content: "q9" });
  assert.ok(h.every((m) => m.role === "user" || m.role === "assistant"));
  assert.deepEqual(brainHistory("x"), []);
});
