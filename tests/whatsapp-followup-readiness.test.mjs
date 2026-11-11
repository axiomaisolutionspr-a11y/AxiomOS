import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { checkWhatsAppFollowupProvider } from "../app/prospectos/autopilot/seguimientos/simulacion-whatsapp/provider.ts";

const actor = "11111111-1111-4111-8111-111111111111";

test("the readiness view classifies synthetic queue items without exposing or mutating the queue", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE SCHEMA axiomos_commercial;
      CREATE ROLE axiomos_commercial_reader;
      CREATE ROLE axiomos_commercial_writer;
      GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_commercial_reader;
      CREATE TABLE public.prospects (
        id bigint PRIMARY KEY, caller_phone text, crm_stage text, follow_up_at timestamptz
      );
    `);
    for (const file of [
      "20261109_axira_followup_queue_qa.sql",
      "20261109_followup_consent_ledger_qa.sql",
      "20261111_whatsapp_followup_readiness.sql",
    ]) {
      await db.exec(await readFile(new URL(`../database/migrations/${file}`, import.meta.url), "utf8"));
    }
    await db.exec(`
      INSERT INTO public.prospects
      SELECT id, CASE WHEN id=8 THEN 'no phone' ELSE '787-555-0100' END,
        CASE WHEN id=6 THEN 'Vendido' ELSE 'Seguimiento' END,
        CASE WHEN id=7 THEN now()+interval '1 day' ELSE now()-interval '1 hour' END
      FROM generate_series(1,12) AS id;

      INSERT INTO axiomos_commercial.followup_queue
        (prospect_id, tenant_id, channel, purpose, status, scheduled_for, dedupe_key)
      SELECT id, CASE WHEN id=12 THEN 'other' ELSE 'axiomai' END,
        CASE WHEN id=10 THEN 'sms' ELSE 'whatsapp' END,
        CASE WHEN id=11 THEN 'appointment_reminder' ELSE 'followup' END,
        CASE WHEN id=9 THEN 'cancelled' ELSE 'needs_review' END,
        now()-interval '1 hour', 'synthetic-' || id
      FROM generate_series(1,12) AS id;

      INSERT INTO axiomos_commercial.followup_contact_permissions
        (prospect_id, channel, purpose, permission_state, evidence_source, recorded_by, recorded_at)
      SELECT id, 'whatsapp', 'followup', 'opt_in', 'test evidence', '${actor}', now()-interval '2 hours'
      FROM generate_series(1,9) AS id WHERE id<>4;

      INSERT INTO axiomos_commercial.followup_contact_permissions
        (prospect_id, channel, purpose, permission_state, evidence_source, recorded_by)
      VALUES (3,'whatsapp','followup','opt_out','test revocation','${actor}');

      INSERT INTO axiomos_commercial.followup_review_decisions (queue_id,decision,actor_id)
      SELECT id, CASE WHEN prospect_id=5 THEN 'blocked' ELSE 'reviewed_only' END,'${actor}'
      FROM axiomos_commercial.followup_queue WHERE prospect_id IN (1,3,5);
    `);

    const before = await db.query("SELECT id, status, updated_at FROM axiomos_commercial.followup_queue ORDER BY id");
    await db.exec("SET ROLE axiomos_commercial_reader");
    const { rows, fields } = await db.query("SELECT * FROM axiomos_commercial.whatsapp_followup_readiness");
    assert.deepEqual(fields.map(field => field.name), ["readiness", "total"]);
    assert.deepEqual(Object.fromEntries(rows.map(row => [row.readiness, row.total])), {
      reviewed: 1, awaiting_review: 1, blocked_review: 2, opted_out: 1,
      no_consent: 1, inactive_followup: 1, scheduled: 1, no_valid_phone: 1,
    });
    await assert.rejects(db.query("SELECT * FROM axiomos_commercial.followup_queue"), { code: "42501" });
    await db.exec("RESET ROLE");
    assert.deepEqual(await db.query("SELECT id, status, updated_at FROM axiomos_commercial.followup_queue ORDER BY id"), before);
    await assert.rejects(
      db.query(`UPDATE axiomos_commercial.followup_queue SET status='approved',
        consent_source='test evidence', consent_verified_at=now(), approved_by='${actor}', approved_at=now()
        WHERE prospect_id=1`),
      { code: "23514", constraint: "followup_queue_no_live_dispatch" },
    );
  } finally {
    await db.close();
  }
});

test("the commercial provider simulation sends only GET requests to exact Dualhook assets", async () => {
  const env = {
    VERCEL_ENV: "production",
    DUALHOOK_API_KEY: "synthetic-key",
    WHATSAPP_PHONE_NUMBER_ID: "10001",
    AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID: "20001",
  };
  const calls = [];
  const simulateProvider = async (url, init) => {
    calls.push([url.href, init.method, init.redirect, init.headers.Authorization]);
    return Response.json(url.pathname.endsWith("10001")
      ? { id: "10001" }
      : { id: "20001", status: "APPROVED", category: "UTILITY" });
  };
  assert.deepEqual(await checkWhatsAppFollowupProvider(env, simulateProvider), { phone: "verified", template: "verified" });
  assert.deepEqual(calls, [
    ["https://api.dualhook.com/v25.0/10001?fields=id", "GET", "error", "Bearer synthetic-key"],
    ["https://api.dualhook.com/v25.0/20001?fields=id%2Cstatus%2Ccategory", "GET", "error", "Bearer synthetic-key"],
  ]);
  assert.deepEqual(await checkWhatsAppFollowupProvider({ ...env, VERCEL_ENV: "preview" }, simulateProvider),
    { phone: "unconfigured", template: "unconfigured" });
  assert.equal(calls.length, 2);
  assert.deepEqual(await checkWhatsAppFollowupProvider(env, async () =>
    Response.json({ id: "99999", status: "APPROVED", category: "UTILITY" })),
  { phone: "unavailable", template: "unavailable" });
});
