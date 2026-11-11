import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { qaMarketingPreferences } from "../app/lib/whatsapp-qa-preferences.mjs";

const scope = { wabaId: "12345", phoneId: "67890", secret: "qa-fixture" };
const event = { category: "marketing_messages", value: "stop", timestamp: "1731705721",
  wa_id: "17875550104", user_id: "US.fixture", parent_user_id: "US.parent" };
const payload = { object: "whatsapp_business_account", entry: [{ id: scope.wabaId, changes: [{
  field: "user_preferences", value: { metadata: { phone_number_id: scope.phoneId }, user_preferences: [event] },
}]}] };

test("preferences require the exact QA account, phone and supported identifiers", () => {
  assert.deepEqual(qaMarketingPreferences(payload, { ...scope, phoneId: "67891" }), []);
  assert.deepEqual(qaMarketingPreferences(payload, { ...scope, wabaId: "12346" }), []);
  const changes = qaMarketingPreferences(payload, scope);
  assert.equal(changes.length, 2);
  assert.notEqual(changes[0].key, changes[1].key);
  assert.ok(changes.every(row => /^[a-f0-9]{64}$/.test(row.key) && row.state === "stop"));
  assert.deepEqual(qaMarketingPreferences(payload, scope), changes);
});

test("database preserves the latest event and gives a simultaneous stop precedence", async () => {
  const db = await PGlite.create();
  try {
    await db.exec("CREATE SCHEMA axiomos_qa_ingress_scope; CREATE ROLE axiomos_wa_qa_ingress; GRANT USAGE ON SCHEMA axiomos_qa_ingress_scope TO axiomos_wa_qa_ingress");
    await db.exec(await readFile(new URL("../database/migrations/20261111_whatsapp_qa_marketing_preferences.sql", import.meta.url), "utf8"));
    const [{ key, timestamp }] = qaMarketingPreferences(payload, scope);
    const record = (state, time) => db.query(
      "SELECT axiomos_qa_ingress_scope.record_meta_marketing_preference($1,$2,to_timestamp($3))",
      [key, state, time]);
    await db.exec("SET ROLE axiomos_wa_qa_ingress");
    await record("resume", timestamp);
    await record("stop", timestamp);
    await record("resume", timestamp);
    await record("resume", timestamp - 1);
    await record("stop", timestamp);
    await record("resume", 4102444800);
    await assert.rejects(db.query("SELECT * FROM axiomos_qa_ingress_scope.meta_whatsapp_marketing_preferences"), { code: "42501" });
    await db.exec("RESET ROLE");
    const current = () => db.query("SELECT preference FROM axiomos_qa_ingress_scope.meta_whatsapp_marketing_preferences");
    assert.deepEqual((await current()).rows, [{ preference: "stop" }]);
    await db.exec("SET ROLE axiomos_wa_qa_ingress");
    await record("resume", timestamp + 1);
    await db.exec("RESET ROLE");
    assert.deepEqual((await current()).rows, [{ preference: "resume" }]);
  } finally {
    await db.close();
  }
});
