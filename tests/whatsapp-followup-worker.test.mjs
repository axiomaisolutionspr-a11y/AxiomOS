import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  isFollowupCronAuthorized,
  runWhatsAppFollowup,
  whatsappFollowupWorkerSettings,
} from "../app/lib/whatsapp-followup-worker.mjs";
import { sendWhatsAppFollowupTemplate } from "../app/prospectos/autopilot/seguimientos/simulacion-whatsapp/pilot-provider.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const recipient = "17875550104";
const now = "2026-11-11T15:00:00Z";

test("the worker requires cron authentication, production activation and the scoped Neon role", () => {
  const secret = "synthetic-cron-secret-1234";
  assert.equal(isFollowupCronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isFollowupCronAuthorized(`bearer ${secret}`, secret), false);
  assert.equal(isFollowupCronAuthorized("Bearer undefined", undefined), false);

  const env = {
    VERCEL_ENV: "production",
    AXIOMOS_WHATSAPP_FOLLOWUP_DISPATCH_ENABLED: "true",
    WHATSAPP_PHONE_NUMBER_ID: "1313032805233574",
    AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID: "1623748565895066",
    DUALHOOK_API_KEY: "fixture-key",
    AXIOMOS_COMMERCIAL_DATABASE_HOST: "ep-qa.neon.tech",
    AXIOMOS_WHATSAPP_FOLLOWUP_WORKER_DATABASE_URL: "postgresql://axiomos_whatsapp_followup_worker:fixture@ep-qa-pooler.neon.tech/neondb",
  };
  assert.ok(whatsappFollowupWorkerSettings(env));
  assert.equal(whatsappFollowupWorkerSettings({ ...env, VERCEL_ENV: "preview" }), null);
  assert.equal(whatsappFollowupWorkerSettings({ ...env, AXIOMOS_WHATSAPP_FOLLOWUP_DISPATCH_ENABLED: undefined }), null);
  assert.equal(whatsappFollowupWorkerSettings({ ...env, AXIOMOS_COMMERCIAL_DATABASE_HOST: "ep-elsewhere.neon.tech" }), null);
  assert.equal(whatsappFollowupWorkerSettings({ ...env, WHATSAPP_PHONE_NUMBER_ID: "1489013234286695" }), null);
  assert.equal(whatsappFollowupWorkerSettings({
    ...env, AXIOMOS_WHATSAPP_FOLLOWUP_WORKER_DATABASE_URL: env.AXIOMOS_WHATSAPP_FOLLOWUP_WORKER_DATABASE_URL.replace("axiomos_whatsapp_followup_worker", "neondb_owner"),
  }), null);
});

test("Neon claim and mocked Dualhook enforce consent, suppression, frequency and no replay", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE ROLE axiomos_commercial_reader;
      CREATE ROLE axiomos_commercial_writer;
      CREATE SCHEMA axiomos_commercial;
      CREATE SCHEMA axiomos_identity;
      CREATE TABLE axiomos_identity.memberships (tenant_id text,user_id uuid,role text,status text);
      CREATE TABLE public.prospects (id bigint PRIMARY KEY,caller_phone text,crm_stage text,follow_up_at timestamptz);
      INSERT INTO axiomos_identity.memberships VALUES ('axiomai','${owner}','owner','active');
      INSERT INTO public.prospects VALUES
        (1,'+1 (787) 555-0104','Seguimiento','2026-11-11T13:00Z'),
        (2,'7875550104','Interesado','2026-11-11T13:00Z');
    `);
    for (const name of [
      "20261109_axira_followup_queue_qa",
      "20261109_followup_consent_ledger_qa",
      "20261111_whatsapp_followup_dispatch",
    ]) {
      await db.exec(await readFile(new URL(`../database/migrations/${name}.sql`, import.meta.url), "utf8"));
    }
    await db.exec(`
      INSERT INTO axiomos_commercial.followup_queue
        (prospect_id,channel,purpose,scheduled_for,dedupe_key)
        VALUES (1,'whatsapp','followup','2026-11-11T14:00Z','fixture1'),
               (2,'whatsapp','followup','2026-11-11T14:00Z','fixture2');
      GRANT EXECUTE ON FUNCTION axiomos_commercial.claim_whatsapp_followup_at(timestamptz)
        TO axiomos_whatsapp_followup_worker;
    `);
    const change = async (sql) => {
      await db.exec("SET SESSION AUTHORIZATION postgres");
      await db.exec(sql);
      await db.exec("SET SESSION AUTHORIZATION axiomos_whatsapp_followup_worker");
    };
    await change("SELECT 1");
    const claim = async (time = now) => (await db.query(
      "SELECT * FROM axiomos_commercial.claim_whatsapp_followup_at($1)", [time]
    )).rows[0];
    const finish = async (claimId, result) => (await db.query(
      "SELECT axiomos_commercial.finish_whatsapp_followup($1,$2,$3) AS saved",
      [claimId, result.outcome, result.providerId]
    )).rows[0].saved;

    assert.equal(await claim(), undefined);
    await assert.rejects(db.query("SELECT * FROM axiomos_commercial.whatsapp_followup_coverage"), { code: "42501" });
    await change(`
      INSERT INTO axiomos_commercial.followup_contact_permissions
        (prospect_id,channel,purpose,permission_state,evidence_source,recorded_by,recorded_at)
        VALUES (1,'whatsapp','followup','opt_in','fixture opt-in','${owner}','2026-11-10T16:00Z'),
               (2,'whatsapp','followup','opt_in','fixture opt-in','${owner}','2026-11-10T16:00Z');
      INSERT INTO axiomos_commercial.whatsapp_followup_authorizations
        (queue_id,consent_id,recipient,owner_id,authorized_at,expires_at)
        VALUES (1,1,'${recipient}','${owner}','2026-11-11T14:00Z','2026-11-18T17:00Z'),
               (2,2,'${recipient}','${owner}','2026-11-11T14:00Z','2026-11-18T17:00Z');
    `);
    assert.equal(await claim(), undefined);
    await change(`
      INSERT INTO axiomos_commercial.whatsapp_followup_coverage VALUES
        ('${recipient}','fixture source','2026-11-01T00:00Z','2026-11-11T14:57Z',
         '2026-11-11T14:50Z',true,false,0,NULL);
    `);
    assert.equal(await claim(), undefined);
    await change("UPDATE axiomos_commercial.whatsapp_followup_coverage SET covered_through='2026-11-11T14:59Z'");
    assert.equal(await claim(), undefined);
    await change("UPDATE axiomos_commercial.whatsapp_followup_coverage SET global_suppressed=false, whatsapp_suppressed=true");
    assert.equal(await claim(), undefined);
    await change(`
      UPDATE axiomos_commercial.whatsapp_followup_coverage SET whatsapp_suppressed=false,
        external_attempts_7d=1,last_external_attempt_at='2026-11-11T14:00Z';
    `);
    assert.equal(await claim(), undefined);
    await change(`
      UPDATE axiomos_commercial.whatsapp_followup_coverage SET external_attempts_7d=0,last_external_attempt_at=NULL;
      INSERT INTO axiomos_commercial.followup_contact_permissions
        (prospect_id,channel,purpose,permission_state,evidence_source,recorded_by,recorded_at)
        VALUES (2,'whatsapp','followup','opt_out','fixture BAJA','${owner}','2026-11-11T14:58Z');
    `);
    assert.equal(await claim(), undefined);
    await change(`
      INSERT INTO axiomos_commercial.followup_contact_permissions
        (prospect_id,channel,purpose,permission_state,evidence_source,recorded_by,recorded_at)
        VALUES (1,'whatsapp','followup','opt_in','fixture new opt-in','${owner}','2026-11-11T14:58:10Z'),
               (2,'whatsapp','followup','opt_in','fixture new opt-in','${owner}','2026-11-11T14:58:10Z');
      UPDATE axiomos_commercial.whatsapp_followup_authorizations
        SET consent_id=queue_id+3,authorized_at='2026-11-11T14:58:15Z';
    `);
    assert.equal(await claim("2026-11-12T01:00:00Z"), undefined);
    let sends = 0;
    const deps = {
      verifyProvider: async () => ({ phone: "verified", template: "verified" }),
      claim,
      send: (to) => sendWhatsAppFollowupTemplate({
        key: "fixture-key", phoneId: "1313032805233574", recipient: to,
      }, async (_url, request) => {
        sends++;
        const { to: actual, template } = JSON.parse(request.body);
        assert.equal(actual, recipient);
        assert.equal(template.name, "seguimiento_consulta_axiomai_es");
        throw Error("fixture provider timeout");
      }),
      finish,
    };
    assert.equal(await runWhatsAppFollowup({ ...deps, verifyProvider: async () => ({ phone: "unavailable", template: "verified" }) }), "provider_unavailable");
    const outcomes = await Promise.all([runWhatsAppFollowup(deps), runWhatsAppFollowup(deps)]);
    assert.deepEqual(outcomes.sort(), ["no_eligible_followup", "unknown"]);
    assert.equal(sends, 1);
    await change(`
      UPDATE axiomos_commercial.whatsapp_followup_coverage
        SET covered_through='2026-11-12T15:59Z',last_inbound_at='2026-11-12T15:57Z';
    `);
    assert.equal(await claim("2026-11-12T16:00:00Z"), undefined);
    await db.exec("SET SESSION AUTHORIZATION postgres");
    const attempts = await db.query("SELECT outcome, provider_message_id FROM axiomos_commercial.whatsapp_followup_attempts");
    assert.deepEqual(attempts.rows, [{ outcome: "unknown", provider_message_id: null }]);
    await db.exec("SET SESSION AUTHORIZATION axiomos_commercial_reader");
    await assert.rejects(db.query("SELECT * FROM axiomos_commercial.claim_whatsapp_followup()"), { code: "42501" });
  } finally {
    await db.close();
  }
});
