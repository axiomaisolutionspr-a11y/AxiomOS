import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { sendWhatsAppPilot, whatsappPilotSettings } from "../app/prospectos/autopilot/seguimientos/simulacion-whatsapp/pilot-provider.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const operator = "22222222-2222-4222-8222-222222222222";
const recipientHash = "a".repeat(64);

test("the authorized pilot can be claimed once, by the active owner and for the armed recipient", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE ROLE axiomos_commercial_reader;
      CREATE ROLE axiomos_commercial_writer;
      CREATE SCHEMA axiomos_commercial;
      CREATE SCHEMA axiomos_identity;
      GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_commercial_writer, axiomos_commercial_reader;
      CREATE TABLE axiomos_identity.memberships (tenant_id text, user_id uuid, role text, status text);
      INSERT INTO axiomos_identity.memberships VALUES
        ('axiomai','${owner}','owner','active'),('axiomai','${operator}','operator','active');
    `);
    await db.exec(await readFile(new URL("../database/migrations/20261111_whatsapp_followup_one_delivery.sql", import.meta.url), "utf8"));
    const claim = async (actor, hash = recipientHash) => (await db.query(
      "SELECT axiomos_commercial.claim_whatsapp_followup_pilot($1,$2) AS ok", [actor, hash]
    )).rows[0].ok;
    await db.exec("SET SESSION AUTHORIZATION axiomos_commercial_writer");
    assert.equal(await claim(owner), false);
    await db.exec("SET SESSION AUTHORIZATION postgres");
    await db.query("INSERT INTO axiomos_commercial.whatsapp_followup_pilot(recipient_hash,expires_at) VALUES($1,now()+interval '1 hour')", [recipientHash]);
    await db.exec("SET SESSION AUTHORIZATION axiomos_commercial_reader");
    await assert.rejects(claim(owner), { code: "42501" });
    await db.exec("SET SESSION AUTHORIZATION postgres; SET SESSION AUTHORIZATION axiomos_commercial_writer");
    await assert.rejects(claim(operator), { code: "42501" });
    assert.equal(await claim(owner, "b".repeat(64)), false);
    assert.equal(await claim(owner), true);
    assert.equal(await claim(owner), false);
    const finish = async (actor, outcome) => (await db.query(
      "SELECT axiomos_commercial.finish_whatsapp_followup_pilot($1,$2,$3) AS ok", [actor, outcome, "wamid.fixture"]
    )).rows[0].ok;
    assert.equal(await finish(operator, "accepted"), false);
    assert.equal(await finish(owner, "accepted"), true);
    assert.equal(await finish(owner, "unknown"), false);
    await db.exec("SET SESSION AUTHORIZATION postgres");
    const rows = (await db.query("SELECT outcome,provider_message_id FROM axiomos_commercial.whatsapp_followup_pilot")).rows;
    assert.deepEqual(rows, [{ outcome: "accepted", provider_message_id: "wamid.fixture" }]);
  } finally { await db.close(); }
});

test("pilot settings require opt-in configuration and send only the pinned Spanish template", async () => {
  const env = {
    VERCEL_ENV: "production", AXIOMOS_WHATSAPP_PILOT_ENABLED: "true",
    AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED: "true", AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID: "1623748565895066",
    WHATSAPP_PHONE_NUMBER_ID: "1419337331256187", DUALHOOK_API_KEY: "fixture-key", AXIOMOS_WHATSAPP_PILOT_TO: "17875550104",
  };
  assert.equal(whatsappPilotSettings({ ...env, VERCEL_ENV: "preview" }), null);
  assert.equal(whatsappPilotSettings({ ...env, AXIOMOS_WHATSAPP_PILOT_ENABLED: "false" }), null);
  assert.equal(whatsappPilotSettings({ ...env, AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED: "false" }), null);
  assert.equal(whatsappPilotSettings({ ...env, WHATSAPP_PHONE_NUMBER_ID: "1489013234286695" }), null);
  const settings = whatsappPilotSettings(env);
  let requests = 0;
  const result = await sendWhatsAppPilot(settings, async (url, request) => {
    requests++;
    assert.equal(url, "https://api.dualhook.com/v25.0/1419337331256187/messages");
    assert.equal(request.method, "POST");
    assert.deepEqual(JSON.parse(request.body), {
      messaging_product: "whatsapp", recipient_type: "individual", to: "17875550104",
      type: "template", template: { name: "seguimiento_consulta_axiomai_es", language: { code: "es" } },
    });
    return Response.json({ messages: [{ id: "wamid.fixture", message_status: "accepted" }] });
  });
  assert.equal(requests, 1);
  assert.deepEqual(result, { outcome: "accepted", providerId: "wamid.fixture" });
  assert.deepEqual(await sendWhatsAppPilot(settings, async () => { throw Error("timeout"); }), { outcome: "unknown", providerId: null });
});
