import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
  loadCurrentOffers, saveOfferDraft, setOfferStatus, listOfferAudit,
} from "../app/lib/axira-offers-store.js";

test("PostgreSQL catalog stores, approves, isolates channels, audits and blocks overlapping promotions", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-offers-test-"));
  const initial = await PGlite.create({ dataDir, extensions: { btree_gist } });
  await initial.exec('CREATE DATABASE axiomos_offers_qa');
  await initial.close();
  const db = await PGlite.create({ dataDir, database: "axiomos_offers_qa", extensions: { btree_gist } });
  const sql = async (parts, ...params) => {
    const query = parts.reduce((statement, part, i) => statement + (i ? "$" + i : "") + part, "");
    return (await db.query(query, params)).rows;
  };
  try {
    const migration = await readFile(new URL("../database/migrations/20261106_axira_offers.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const offer = {
      name: "Oferta CRM sintética", product: "crm", start: new Date(Date.now() - 3600000).toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(), normal: 5900, promo: 999, activation: 2500,
      channels: ["whatsapp", "messenger"], taxIncluded: false, termsEs: "Contrato QA.",
      termsEn: "QA contract.", externalEs: "Sin gastos.", externalEn: "No fees.", maxClients: 3,
    };
    const request = randomUUID();
    const [first] = await saveOfferDraft(sql, offer, request);
    assert.equal((await saveOfferDraft(sql, offer, request)).length, 0);
    assert.deepEqual((await loadCurrentOffers("whatsapp", sql)).offers, []);
    assert.equal((await setOfferStatus(sql, first.id, 1, "approved"))[0].revision, 2);
    assert.equal((await loadCurrentOffers("whatsapp", sql)).offers[0].promo_cents, 999);
    assert.equal((await loadCurrentOffers("messenger", sql)).offers.length, 1);
    assert.deepEqual((await loadCurrentOffers("instagram", sql)).offers, []);
    const [second] = await saveOfferDraft(sql, { ...offer, name: "Oferta incompatible" }, randomUUID());
    await assert.rejects(setOfferStatus(sql, second.id, 1, "approved"), { code: "23P01" });
    assert.deepEqual(await setOfferStatus(sql, first.id, 1, "paused"), []);
    await setOfferStatus(sql, first.id, 2, "paused");
    assert.deepEqual((await loadCurrentOffers("whatsapp", sql)).offers, []);
    const audit = await listOfferAudit(sql);
    assert.equal(audit.length, 4);
    assert.deepEqual(audit.filter((event) => event.offer_id === first.id).map((event) => event.status), ["paused", "approved", "draft"]);

  } finally {
    await db.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
