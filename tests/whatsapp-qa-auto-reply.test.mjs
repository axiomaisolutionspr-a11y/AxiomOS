import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { dispatchQaFollowup, recordQaDeliveryStatus, sendAutomaticQaReply } from "../app/api/whatsapp-qa/delivery.ts";
import { qaTextMessages } from "../app/lib/whatsapp-qa-events.mjs";

test("only a fresh, authorized QA webhook message dispatches one reply", async (t) => {
  const hash = (text) => createHash("sha256").update(text).digest("hex");
  const recipient = "15555550123";
  const config = { wabaId: "1462452756074965", phoneNumberId: "1489013234286695", recipient };
  const database = new URL("postgresql://axiomos_wa_qa_ingress@ep-polished-fire-avorljs7-pooler.c-11.us-east-1.aws.neon.tech/neondb");
  const qaEnv = {
    VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feature/axiomos-whatsapp-meta-qa-20261110",
    META_WA_QA_ACCESS_TOKEN: "mock-token", META_WA_QA_ALLOWED_SENDER: recipient,
    META_WA_QA_WABA_ID: config.wabaId, META_WA_QA_PHONE_ID: config.phoneNumberId,
  };
  const previous = Object.fromEntries(Object.keys(qaEnv).map((key) => [key, process.env[key]]));
  Object.assign(process.env, qaEnv);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE SCHEMA axiomos_qa_ingress_scope; CREATE ROLE axiomos_wa_qa_ingress;
    GRANT USAGE ON SCHEMA axiomos_qa_ingress_scope TO axiomos_wa_qa_ingress;
    ALTER DEFAULT PRIVILEGES IN SCHEMA axiomos_qa_ingress_scope GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO axiomos_wa_qa_ingress;`);
  for (const migration of ["processing", "delivery", "auto_reply"]) {
    await db.exec(await readFile(new URL(`../database/migrations/20261111_whatsapp_qa_${migration}.sql`, import.meta.url), "utf8"));
  }
  await db.exec(`CREATE SCHEMA axiomos_commercial;
    CREATE TABLE axiomos_commercial.qa_delivery_outbox (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, test_key text NOT NULL UNIQUE,
      tenant_id text NOT NULL DEFAULT 'axiomai', channel text NOT NULL,
      status text NOT NULL DEFAULT 'pending', is_synthetic boolean NOT NULL DEFAULT true,
      authorized boolean NOT NULL, opt_in boolean NOT NULL, suppressed boolean NOT NULL,
      due_at timestamptz NOT NULL, claim_at timestamptz, attempts integer NOT NULL DEFAULT 0,
      audit_note text NOT NULL DEFAULT ''
    );`);
  // Pin the database clock so the dispatch checks do not depend on CI running during Puerto Rico hours.
  const followupTime = "2026-11-11T15:00:00.000Z";
  const bridge = await readFile(new URL("../database/migrations/20261111_whatsapp_qa_followup_bridge.sql", import.meta.url), "utf8");
  await db.exec(bridge.replaceAll("now()", `timestamptz '${followupTime}'`));
  const sql = async (parts, ...values) => (await db.query(parts.reduce((query, part, i) =>
    query + part + (i < values.length ? `$${i + 1}` : ""), ""), values)).rows;

  const now = Math.floor(Date.now() / 1000);
  const text = "Prueba Axira QA abc12345";
  const [message] = qaTextMessages({ object: "whatsapp_business_account", entry: [{ id: config.wabaId,
    changes: [{ field: "messages", value: { metadata: { phone_number_id: config.phoneNumberId },
      messages: [{ id: "wamid.inbound", from: recipient, type: "text", timestamp: String(now), text: { body: text } }],
    } }],
  }] }, config);
  const key = hash(message.id);
  const otherKey = hash("wamid.other");
  await sql`INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_processing (message_hash,state,attempt_id,reply)
    VALUES (${key},'completed','mock','Respuesta QA'), (${otherKey},'completed','mock','Otra respuesta')`;

  const providerId = "wamid.mock-outbound";
  const followupId = "wamid.mock-followup";
  const followupBody = "Seguimiento interno de QA";
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `https://graph.facebook.com/v27.0/${config.phoneNumberId}/messages`);
    const body = JSON.parse(options.body);
    assert.equal(body.to, recipient);
    if (body.text.body === followupBody) {
      await recordQaDeliveryStatus(sql, database, config.wabaId, config.phoneNumberId, {
        statuses: [{ id: followupId, recipient_id: recipient, status: "delivered" }],
      });
      return Response.json({ messages: [{ id: followupId }] });
    }
    assert.deepEqual(body, { messaging_product: "whatsapp", to: recipient, type: "text", text: { body: "Respuesta QA" } });
    return Response.json({ messages: [{ id: providerId }] });
  });

  await sendAutomaticQaReply(sql, database, message, key);
  assert.equal(fetch.mock.callCount(), 0);
  await sql`INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply (challenge_hash,recipient_hash,issued_at,expires_at)
    VALUES (${hash(text)},${hash(recipient)},to_timestamp(${now - 5}),to_timestamp(${now + 120}))`;
  await db.exec("SET ROLE axiomos_wa_qa_ingress;");
  const [access] = await sql`SELECT
    has_table_privilege('axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply', 'INSERT') AS can_create_grant,
    has_column_privilege('axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply', 'expires_at', 'UPDATE') AS can_extend_grant`;
  assert.deepEqual(access, { can_create_grant: false, can_extend_grant: false });
  await sendAutomaticQaReply(sql, database, { ...message, timestamp: now - 120 }, key);
  await sendAutomaticQaReply(sql, database, { ...message, text: "Prueba Axira QA ffffffff" }, key);
  await sendAutomaticQaReply(sql, new URL("postgresql://wrong.neon.tech/neondb"), message, key);
  assert.equal(fetch.mock.callCount(), 0);

  await Promise.all([sendAutomaticQaReply(sql, database, message, key), sendAutomaticQaReply(sql, database, message, key)]);
  await sendAutomaticQaReply(sql, database, message, otherKey);
  assert.equal(fetch.mock.callCount(), 1);
  await recordQaDeliveryStatus(sql, database, config.wabaId, config.phoneNumberId, {
    statuses: [{ id: providerId, recipient_id: recipient, status: "delivered" }],
  });
  const [delivery] = await sql`SELECT message_hash, attempted_at, accepted_at, delivered_at FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery`;
  assert.equal(delivery.message_hash, key);
  assert.ok(delivery.attempted_at && delivery.accepted_at && delivery.delivered_at);

  await db.exec("RESET ROLE");
  const followupCode = "Prueba seguimiento Axira QA abc123abcdef";
  const blockedCode = "Prueba seguimiento Axira QA ffffffabcdef";
  for (const [code, suppressed] of [[followupCode, false], [blockedCode, true]]) {
    await sql`WITH job AS (
      INSERT INTO axiomos_commercial.qa_delivery_outbox (test_key, channel, authorized, opt_in, suppressed, due_at)
      VALUES (${"QA-WA-FOLLOWUP-" + (suppressed ? "BLOCKED" : "PASS")},'whatsapp',true,true,${suppressed},'2026-11-11 14:59Z') RETURNING id
    ) INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_followup
      (outbox_id, challenge_hash, recipient_hash, body, issued_at, expires_at)
    SELECT id, ${hash(code)}, ${hash(recipient)}, ${followupBody}, '2026-11-11 14:59Z','2026-11-11 15:05Z' FROM job`;
  }
  await db.exec("SET ROLE axiomos_wa_qa_ingress");
  const next = { id: "wamid.followup", text: followupCode, timestamp: Date.parse(followupTime) / 1000 };
  assert.equal(await dispatchQaFollowup(sql, database, { ...next, text: "Hola" }), false);
  await dispatchQaFollowup(sql, database, { ...next, text: blockedCode });
  await dispatchQaFollowup(sql, database, { ...next, timestamp: next.timestamp - 120 });
  assert.equal(fetch.mock.callCount(), 1);
  await Promise.all([dispatchQaFollowup(sql, database, next), dispatchQaFollowup(sql, database, next)]);
  await dispatchQaFollowup(sql, database, { ...next, id: "wamid.followup-retry" });
  assert.equal(fetch.mock.callCount(), 2);
  await db.exec("RESET ROLE");
  const entries = await sql`SELECT q.status, q.attempts, g.provider_hash, s.delivered_at
    FROM axiomos_commercial.qa_delivery_outbox q
    JOIN axiomos_qa_ingress_scope.meta_whatsapp_qa_followup g ON g.outbox_id=q.id
    LEFT JOIN axiomos_qa_ingress_scope.meta_whatsapp_qa_followup_status s ON s.provider_hash=g.provider_hash
    ORDER BY q.id`;
  assert.equal(entries[0].status, "accepted");
  assert.equal(entries[0].attempts, 1);
  assert.equal(entries[0].provider_hash, hash(followupId));
  assert.ok(entries[0].delivered_at);
  assert.deepEqual(entries[1], { status: "pending", attempts: 0, provider_hash: null, delivered_at: null });
});
