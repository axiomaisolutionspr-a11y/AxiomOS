import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { marketingPreferenceEvents, validWebhookSignature } from "../app/lib/meta-marketing-preferences.mjs";

const scope = { wabaId: "123", phoneId: "456", contactKeySecret: "fixture".repeat(5) };
const change = { field: "user_preferences", value: {
  messaging_product: "whatsapp", metadata: { phone_number_id: "456" },
  user_preferences: [{ category: "marketing_messages", value: "stop", timestamp: "1731705721", wa_id: "17875550104" }],
}};
const payload = { object: "whatsapp_business_account", entry: [{ id: "123", changes: [change] }] };

test("authenticates raw bytes and scopes events to the selected account, number and field", () => {
  const body = Buffer.from(JSON.stringify(payload));
  const signature = "sha256=" + createHmac("sha256", "fixture-app-secret").update(body).digest("hex");
  assert.equal(validWebhookSignature(body, signature, "fixture-app-secret"), true);
  assert.equal(validWebhookSignature(Buffer.concat([body, Buffer.from(" ")]), signature, "fixture-app-secret"), false);
  assert.deepEqual(marketingPreferenceEvents(payload, { ...scope, wabaId: "999" }), []);
  assert.deepEqual(marketingPreferenceEvents(payload, { ...scope, phoneId: "999" }), []);
  assert.deepEqual(marketingPreferenceEvents({ ...payload, entry: [{ id: "123", changes: [{ ...change, field: "messages" }] }] }, scope), []);
  const events = marketingPreferenceEvents(payload, scope);
  assert.equal(events.length, 1);
  assert.match(events[0].key, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(events).includes("17875550104"));
});

test("records replayed and out-of-order changes with a restricted database role", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(await readFile(new URL("../database/migrations/20261111_meta_marketing_preferences_ingress.sql", import.meta.url), "utf8"));
    const [stop] = marketingPreferenceEvents(payload, scope);
    const tied = { ...stop, preference: "resume" };
    const write = async (events) => {
      await db.exec("SET ROLE axiomos_meta_preferences_ingress");
      await db.query("SELECT axiomos_meta_preferences.record_events($1::jsonb)", [JSON.stringify(events)]);
      await assert.rejects(db.query("SELECT * FROM axiomos_meta_preferences.contact_preferences"), { code: "42501" });
      await db.exec("RESET ROLE");
      return (await db.query("SELECT preference FROM axiomos_meta_preferences.contact_preferences")).rows;
    };
    assert.deepEqual(await write([tied, stop, stop]), [{ preference: "stop" }]);
    assert.deepEqual(await write([tied, { ...tied, timestamp: tied.timestamp - 1 }]), [{ preference: "stop" }]);
    assert.deepEqual(await write([{ ...tied, timestamp: tied.timestamp + 1 }]), [{ preference: "resume" }]);
  } finally {
    await db.close();
  }
});
