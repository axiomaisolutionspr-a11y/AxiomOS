// Contador mensual de preguntas a Brain: límite, reservas simultáneas, devolución y aislamiento entre negocios.
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { brainMonthlyLimit, brainPeriod, brainUsage, releaseBrainQuestion, reserveBrainQuestion } from "../app/lib/brain-usage-store.js";

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-brain-usage-"));
  const initial = await PGlite.create({ dataDir });
  await initial.exec("CREATE DATABASE neondb");
  await initial.close();
  const db = await PGlite.create({ dataDir, database: "neondb" });
  await db.exec("CREATE ROLE axiomos_commercial_writer NOLOGIN; CREATE ROLE axiomos_commercial_reader NOLOGIN;");
  const migration = await readFile(new URL("../database/migrations/20261120_brain_usage.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration); // idempotente
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

test("El periodo es el mes de Puerto Rico y el límite viene de la configuración", () => {
  assert.equal(brainPeriod(Date.parse("2026-12-01T03:59:00Z")), "2026-11"); // 11:59 p. m. del 30-nov en PR
  assert.equal(brainPeriod(Date.parse("2026-12-01T04:00:00Z")), "2026-12");
  assert.equal(brainMonthlyLimit({}), 100);
  assert.equal(brainMonthlyLimit({ BRAIN_OWNER_MONTHLY_LIMIT: "20" }), 20);
  assert.equal(brainMonthlyLimit({ BRAIN_OWNER_MONTHLY_LIMIT: "-5" }), 100);
  assert.equal(brainMonthlyLimit({ BRAIN_OWNER_MONTHLY_LIMIT: "abc" }), 100);
});

test("Contador de Brain: no pasa del límite, devuelve fallos y separa negocios", async () => {
  const env = await setup();
  try {
    const period = "2026-11";
    for (let i = 1; i <= 3; i += 1) assert.deepEqual(await reserveBrainQuestion(env.writer, "axiomai", 3, period), { ok: true, used: i });
    assert.deepEqual(await reserveBrainQuestion(env.writer, "axiomai", 3, period), { ok: false, used: 3 }, "la 4.ª pregunta se rechaza");

    await releaseBrainQuestion(env.writer, "axiomai", period);
    assert.equal(await brainUsage(env.writer, "axiomai", period), 2, "un fallo de la IA no se cobra");
    assert.equal((await reserveBrainQuestion(env.writer, "axiomai", 3, period)).ok, true);

    // Preguntas a la vez no rompen el límite.
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveBrainQuestion(env.writer, "otro-negocio", 5, period)));
    assert.equal(results.filter((r) => r.ok).length, 5);
    assert.equal(await brainUsage(env.writer, "otro-negocio", period), 5);

    // Aislamiento: cada negocio solo ve su fila.
    assert.equal(await brainUsage(env.reader, "axiomai", period), 3);
    const visible = await env.reader.tx([
      { text: "SELECT set_config('axiomos.tenant_id', 'axiomai', true)" },
      { text: "SELECT tenant_id FROM axiomos_commercial.brain_usage" },
    ]);
    assert.deepEqual(visible[1].map((r) => r.tenant_id), ["axiomai"]);
    const none = await env.reader.tx([{ text: "SELECT count(*)::int AS n FROM axiomos_commercial.brain_usage" }]);
    assert.equal(none[0][0].n, 0, "sin negocio fijado no se ve nada");

    // El lector no puede escribir; nadie baja de cero.
    await assert.rejects(reserveBrainQuestion(env.reader, "axiomai", 10, period));
    await releaseBrainQuestion(env.writer, "nuevo", period);
    assert.equal(await brainUsage(env.writer, "nuevo", period), 0);
    assert.deepEqual(await reserveBrainQuestion(env.writer, "axiomai", 0, period), { ok: false, used: 0 });
  } finally {
    await env.close();
  }
});
