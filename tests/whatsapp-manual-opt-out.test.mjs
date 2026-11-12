import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { novemberCampaignAudienceQuery, reserveNovemberCampaignSendQuery } from "../app/prospectos/campanas/noviembre/audience.mjs";

test("an owner records one WhatsApp opt-out across campaign and commercial follow-ups", async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const viewer = "22222222-2222-4222-8222-222222222222";
  await db.exec(`
    CREATE SCHEMA axiomos_commercial;
    CREATE SCHEMA axiomos_identity;
    CREATE ROLE axiomos_commercial_reader;
    CREATE ROLE axiomos_commercial_writer;
    CREATE ROLE axiomos_autopilot_qa_offer_writer;
    CREATE ROLE neondb_owner;
    GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_commercial_reader, axiomos_commercial_writer;
    CREATE TABLE axiomos_identity.memberships (tenant_id text, user_id uuid, role text, status text);
    CREATE TABLE public.prospects (
      id bigint PRIMARY KEY, caller_phone text, caller_name text, caller_company text, crm_notes text,
      crm_stage text, follow_up_at timestamptz
    );
    CREATE TABLE public.whatsapp_messages (phone text, role text, message text, created_at timestamptz);
  `);
  for (const file of [
    "20261101_whatsapp_campaign_sends.sql",
    "20261109_axira_followup_queue_qa.sql",
    "20261109_followup_consent_ledger_qa.sql",
    "20261109_followup_generator_dryrun.sql",
    "20261112_whatsapp_manual_opt_out_qa.sql",
  ]) await db.exec(await readFile(new URL(`../database/migrations/${file}`, import.meta.url), "utf8"));
  await db.query(`INSERT INTO axiomos_identity.memberships VALUES
    ('axiomai',$1,'owner','active'), ('axiomai',$2,'viewer','active')`, [owner, viewer]);
  await db.exec(`
    INSERT INTO public.prospects VALUES
      (1,'(787) 555-0101','Contacto A','','','Seguimiento',now()-interval '2 hours'),
      (2,'+1 787-555-0101','Contacto B','','','Seguimiento',now()-interval '2 hours'),
      (3,'939-555-0102','Contacto C','','','Seguimiento',now()-interval '2 hours'),
      (4,'787-555-0103','Contacto D','','','Seguimiento',now()-interval '2 hours');
    INSERT INTO public.whatsapp_messages VALUES
      ('17875550101','user','Hola',now()), ('19395550102','user','Hola',now()),
      ('17875550103','user','BAJA',now());
    INSERT INTO axiomos_commercial.followup_queue (prospect_id,channel,purpose,scheduled_for,dedupe_key) VALUES
      (1,'whatsapp','followup',now(),'existing-wa'), (2,'whatsapp','followup',now(),'duplicate-wa'),
      (1,'sms','followup',now(),'unrelated-sms'), (1,'whatsapp','appointment_reminder',now(),'unrelated-service');
  `);
  await db.query(`INSERT INTO axiomos_commercial.followup_contact_permissions
    (prospect_id, channel, purpose, permission_state, evidence_source, recorded_by)
    VALUES (1,'whatsapp','followup','opt_in','Fixture',$1),(2,'whatsapp','followup','opt_in','Fixture',$1),
      (1,'sms','followup','opt_in','Fixture',$1),(1,'whatsapp','appointment_reminder','opt_in','Fixture',$1)`, [owner]);

  const audience = async (enabled) => (await db.query(novemberCampaignAudienceQuery(enabled)))
    .rows.map(({ id }) => id).sort();
  assert.deepEqual(await audience(true), ["1", "2", "3"]);
  await db.exec("SET ROLE axiomos_autopilot_qa_offer_writer");
  const register = (id, actor) => db.query(
    "SELECT axiomos_commercial.record_whatsapp_manual_opt_out($1::bigint,$2::uuid) AS result",
    [id, actor]
  );
  await assert.rejects(register(1, viewer), { code: "42501" });
  assert.deepEqual((await register(99, owner)).rows, [{ result: "invalid_prospect" }]);
  assert.deepEqual((await register(1, owner)).rows, [{ result: "recorded" }]);
  assert.deepEqual((await register(2, owner)).rows, [{ result: "already_recorded" }]);
  await assert.rejects(db.query("SELECT * FROM axiomos_commercial.whatsapp_manual_opt_outs"), { code: "42501" });
  await db.exec("RESET ROLE");
  assert.deepEqual(await audience(true), ["3"]);
  assert.deepEqual(await audience(false), ["1", "2", "3"]);
  const reserve = reserveNovemberCampaignSendQuery(true);
  assert.deepEqual((await db.query(reserve, ["synthetic", "1", "17875550101", "fixture"])).rows, []);
  assert.equal((await db.query(reserve, ["synthetic", "3", "19395550102", "fixture"])).rows.length, 1);

  await db.exec("SET ROLE axiomos_commercial_reader");
  const states = await db.query("SELECT item_id,eligibility FROM axiomos_commercial.followup_eligibility ORDER BY item_id");
  assert.deepEqual(states.rows.map(({ eligibility }) => eligibility), [
    "blocked_opt_out", "blocked_opt_out", "consent_recorded_requires_review", "consent_recorded_requires_review",
  ]);
  await db.exec("RESET ROLE");
  await db.exec(`
    GRANT USAGE ON SCHEMA axiomos_commercial TO neondb_owner;
    GRANT SELECT ON public.prospects, axiomos_commercial.followup_contact_permissions TO neondb_owner;
    GRANT SELECT, INSERT ON axiomos_commercial.followup_queue TO neondb_owner;
    GRANT USAGE ON SEQUENCE axiomos_commercial.followup_queue_id_seq TO neondb_owner;
    GRANT EXECUTE ON FUNCTION axiomos_commercial.is_whatsapp_manually_opted_out(text) TO neondb_owner;
    ALTER FUNCTION axiomos_commercial.generate_followup_drafts_dryrun() OWNER TO neondb_owner;
  `);
  assert.deepEqual((await db.query("SELECT axiomos_commercial.generate_followup_drafts_dryrun() AS total")).rows, [{ total: 2 }]);
  const drafts = await db.query("SELECT prospect_id FROM axiomos_commercial.followup_queue WHERE dedupe_key LIKE 'followup:%' ORDER BY prospect_id");
  assert.deepEqual(drafts.rows.map(({ prospect_id }) => Number(prospect_id)), [3, 4]);
});
