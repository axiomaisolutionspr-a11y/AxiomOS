import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDraft, transition, restoreVersion, loadPublishedCatalog, listCatalog,
} from "../app/lib/axira-catalog-store.js";
import { validateItemInput, answerFromCatalog } from "../app/lib/axira-catalog-policy.js";

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-catalog-test-"));
  const initial = await PGlite.create({ dataDir });
  await initial.exec("CREATE DATABASE neondb");
  await initial.close();
  let db = await PGlite.create({ dataDir, database: "neondb" });
  const migration = await readFile(new URL("../database/migrations/20261119_axiomos_catalog_v2.sql", import.meta.url), "utf8");
  // Rol sin privilegios de superusuario: así RLS se aplica de verdad (los superusuarios la ignoran).
  await db.exec(`CREATE ROLE axiomos_commercial_writer NOLOGIN; CREATE ROLE axiomos_commercial_reader NOLOGIN;`);
  await db.exec(migration);
  await db.exec(migration); // idempotente
  const adapter = (role) => ({
    run: async (text, params) => db.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      return (await tx.query(text, params)).rows;
    }),
    tx: async (queries) => db.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      const out = [];
      for (const q of queries) out.push((await tx.query(q.text, q.params ?? [])).rows);
      return out;
    }),
  });
  return {
    db, writer: adapter("axiomos_commercial_writer"), reader: adapter("axiomos_commercial_reader"),
    async restart() { await db.close(); db = await PGlite.create({ dataDir, database: "neondb" }); },
    async close() { await db.close(); await rm(dataDir, { recursive: true, force: true }); },
  };
}

const AUTOPILOT = validateItemInput({
  key: "axiomos-autopilot", kind: "plan", name: "AxiomOS Autopilot", pricingMode: "fixed", billingPeriod: "month",
  regular: "17.95", promo: "9.99", promoMonths: "3", usersIncluded: "2", callMinutes: "200", axiraResponses: "500",
  channels: ["whatsapp", "messenger", "instagram", "web"], validFrom: "2026-11-01T00:00",
});

test("Catálogo en PostgreSQL: versiones, publicación, auditoría, restauración, aislamiento y persistencia", async () => {
  const env = await setup();
  try {
    assert.equal(AUTOPILOT.ok, true);
    const owner = "user:qa-owner";
    // Caso 1-2: crear y recuperar precios exactos
    const v1 = await createDraft(env.writer, "axiomai", "item", "axiomos-autopilot", AUTOPILOT.value, owner, "Alta inicial QA");
    assert.equal(v1.version, 1);
    let published = await loadPublishedCatalog(env.reader, "axiomai", "whatsapp");
    assert.equal(published.items.length, 0, "un borrador no es visible para Axira");
    await assert.rejects(transition(env.writer, "axiomai", "item", "axiomos-autopilot", 1, "published", owner), { code: "STALE" },
      "no se publica sin aprobar");
    await transition(env.writer, "axiomai", "item", "axiomos-autopilot", 1, "approved", owner, "Revisado");
    await transition(env.writer, "axiomai", "item", "axiomos-autopilot", 1, "published", owner, "Publicar QA");
    published = await loadPublishedCatalog(env.reader, "axiomai", "whatsapp");
    assert.equal(published.items.length, 1);
    assert.equal(published.items[0].regular_cents, 1795);
    assert.equal(published.items[0].promo_cents, 999);
    assert.deepEqual(published.items[0].limits, { call_minutes: 200, axira_responses: 500 });
    assert.match(answerFromCatalog(published, { message: "¿Cuánto cuesta AxiomOS Autopilot?" }).reply, /\$9\.99/);

    // Contenido inmutable y transición inválida
    await assert.rejects(env.writer.tx([
      { text: "SELECT set_config('axiomos.tenant_id', 'axiomai', true)" },
      { text: "UPDATE axiomos_commercial.catalog_items SET status = 'draft' WHERE item_key = 'axiomos-autopilot'" },
    ]));
    await assert.rejects(env.db.query("UPDATE axiomos_commercial.catalog_items SET regular_cents = 1 WHERE item_key = 'axiomos-autopilot'"),
      /inmutable/);
    await assert.rejects(env.db.query("DELETE FROM axiomos_commercial.catalog_items"), /archívalas/);
    await assert.rejects(env.db.query("DELETE FROM axiomos_commercial.catalog_audit"), /inserciones/);

    // Caso 3/4: versión 2 sin promoción (fin de campaña) reemplaza a la 1
    const noPromo = { ...AUTOPILOT.value, promo_cents: null, promo_months: null };
    await createDraft(env.writer, "axiomai", "item", "axiomos-autopilot", noPromo, owner, "Fin de promoción");
    await transition(env.writer, "axiomai", "item", "axiomos-autopilot", 2, "approved", owner);
    await transition(env.writer, "axiomai", "item", "axiomos-autopilot", 2, "published", owner);
    published = await loadPublishedCatalog(env.reader, "axiomai", "whatsapp");
    assert.equal(published.items.length, 1, "solo una versión publicada por clave");
    assert.equal(published.items[0].version, 2);
    assert.match(answerFromCatalog(published, { message: "precio de autopilot" }).reply, /cuesta \$17\.95 al mes/);

    // Caso 10: restaurar la versión autorizada anterior (crea v3 aprobada) y publicarla
    const v3 = await restoreVersion(env.writer, "axiomai", "item", "axiomos-autopilot", 1, owner, "Reactivar promoción");
    assert.equal(v3.version, 3);
    await transition(env.writer, "axiomai", "item", "axiomos-autopilot", 3, "published", owner);
    published = await loadPublishedCatalog(env.reader, "axiomai", "whatsapp");
    assert.equal(published.items[0].promo_cents, 999);
    const { items, audit } = await listCatalog(env.reader, "axiomai");
    assert.deepEqual(items.map((i) => `${i.version}:${i.status}`), ["3:published", "2:archived", "1:archived"]);
    const actions = audit.map((a) => a.action);
    for (const a of ["create_draft", "approve", "publish", "archive", "restore"]) assert.ok(actions.includes(a), a);
    assert.ok(audit.every((a) => a.actor === owner || a.action === "archive"));

    // Caso 9: aislamiento entre negocios
    await createDraft(env.writer, "cliente-demo", "item", "plan-cliente",
      { ...AUTOPILOT.value, name: "Plan del cliente" }, "user:cliente", "QA");
    const otro = await listCatalog(env.reader, "cliente-demo");
    assert.equal(otro.items.length, 1);
    assert.equal(otro.items[0].name, "Plan del cliente");
    assert.ok((await listCatalog(env.reader, "axiomai")).items.every((i) => i.tenant_id === "axiomai"));
    const leak = await env.reader.tx([
      { text: "SELECT set_config('axiomos.tenant_id', 'cliente-demo', true)" },
      { text: "SELECT count(*)::int AS n FROM axiomos_commercial.catalog_items WHERE tenant_id = 'axiomai'" },
    ]);
    assert.equal(leak[1][0].n, 0, "RLS impide leer otro negocio aunque se pida explícitamente");
    const noTenant = await env.reader.run("SELECT count(*)::int AS n FROM axiomos_commercial.catalog_items");
    assert.equal(noTenant[0].n, 0, "sin tenant fijado no se ve nada");
    await assert.rejects(env.writer.tx([
      { text: "SELECT set_config('axiomos.tenant_id', 'cliente-demo', true)" },
      { text: `INSERT INTO axiomos_commercial.catalog_items (tenant_id, item_key, version, kind, name, pricing_mode, created_by)
        VALUES ('axiomai', 'intruso', 1, 'service', 'Intruso', 'quote', 'x')` },
    ]), "no se puede escribir en otro negocio");
    await assert.rejects(env.reader.tx([
      { text: "SELECT set_config('axiomos.tenant_id', 'axiomai', true)" },
      { text: `INSERT INTO axiomos_commercial.catalog_items (tenant_id, item_key, version, kind, name, pricing_mode, created_by)
        VALUES ('axiomai', 'lector', 1, 'service', 'Lector', 'quote', 'x')` },
    ]), "el rol lector de Axira no puede escribir");

    // Caso 11: persistencia tras reinicio
    await env.restart();
    published = await loadPublishedCatalog(env.reader, "axiomai", "instagram");
    assert.equal(published.items[0].version, 3);
  } finally {
    await env.close();
  }
});
