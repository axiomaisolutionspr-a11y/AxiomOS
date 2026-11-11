import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { claimQaMessage } from "../app/lib/whatsapp-qa-claim.mjs";

test("claims each message once, and only retries an explicit failure", async () => {
  const db = new PGlite();
  await db.exec("CREATE SCHEMA axiomos_qa_ingress_scope; CREATE TABLE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing (message_hash text PRIMARY KEY, state text NOT NULL, attempt_id text NOT NULL, updated_at timestamptz DEFAULT now());");
  const sql = async (strings, ...values) => (await db.query(strings.reduce((a, part, i) => a + part + (i < values.length ? `$${i + 1}` : ""), ""), values)).rows;
  const hash = "a".repeat(64);
  const claims = await Promise.all([claimQaMessage(sql, hash, "one"), claimQaMessage(sql, hash, "two")]);
  assert.equal(claims.filter(Boolean).length, 1);
  await db.query("UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing SET state='completed' WHERE message_hash=$1", [hash]);
  assert.equal(await claimQaMessage(sql, hash, "three"), false);
  await db.query("UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing SET state='failed' WHERE message_hash=$1", [hash]);
  assert.equal(await claimQaMessage(sql, hash, "four"), true);
  assert.equal(await claimQaMessage(sql, hash, "five"), false);
  await db.query("UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing SET updated_at=now()-interval '3 minutes' WHERE message_hash=$1", [hash]);
  assert.equal(await claimQaMessage(sql, hash, "six"), true);
  const rows = await db.query("SELECT attempt_id FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_processing WHERE message_hash=$1", [hash]);
  assert.equal(rows.rows[0].attempt_id, "six");
  await db.close();
});
