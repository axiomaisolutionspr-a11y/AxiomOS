import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { buildSocialProspect, saveSocialProspect } from "../app/lib/social-prospect.mjs";

// Adaptador: convierte la plantilla sql`...` (estilo neon) en una consulta con $1..$n.
function sqlFor(db) {
  return async (strings, ...values) => {
    const text = strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""), "");
    return (await db.query(text, values)).rows;
  };
}

async function freshDb() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE prospects (
    id serial PRIMARY KEY,
    prospect_key text UNIQUE NOT NULL,
    caller_name text, caller_phone text, caller_company text,
    crm_stage text, assigned_to text, crm_notes text,
    first_seen_at timestamptz, last_seen_at timestamptz,
    created_at timestamptz, updated_at timestamptz)`);
  return db;
}

test("builds the same key and notes format as /api/meta", () => {
  const p = buildSocialProspect({ channel: "instagram", senderId: "123", messageId: "mid.1", text: "Hola", reply: "¡Hola!" });
  assert.equal(p.prospectKey, "social:instagram:123");
  assert.equal(p.callerName, "Prospecto de Instagram");
  assert.match(p.notes, /^SOCIAL \/ AXIOMOS BRAIN — MENSAJE ENTRANTE\nCanal: Instagram\nID del mensaje: mid\.1\nID social: 123\n/);
  assert.match(p.notes, /Mensaje del prospecto:\nHola\n\nRespuesta de Axira:\n¡Hola!$/);
});

test("records '(sin respuesta)' when Axira did not answer and caps notes length", () => {
  const p = buildSocialProspect({ channel: "instagram", senderId: "1", messageId: undefined, text: "x".repeat(9000), reply: null });
  assert.equal(p.notes.length, 6000);
  const q = buildSocialProspect({ channel: "instagram", senderId: "1", messageId: "m", text: "hola", reply: null });
  assert.match(q.notes, /\(sin respuesta\)$/);
});

test("inserts a new prospect and appends notes on the next message", async () => {
  const db = await freshDb();
  const sql = sqlFor(db);
  await saveSocialProspect(sql, buildSocialProspect({ channel: "instagram", senderId: "42", messageId: "m1", text: "Hola", reply: "R1" }));
  await saveSocialProspect(sql, buildSocialProspect({ channel: "instagram", senderId: "42", messageId: "m2", text: "Precio?", reply: "R2" }));
  const { rows } = await db.query("SELECT * FROM prospects");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].prospect_key, "social:instagram:42");
  assert.equal(rows[0].crm_stage, "Nuevo");
  assert.equal(rows[0].assigned_to, "Rolando");
  assert.equal(rows[0].caller_phone, null);
  assert.match(rows[0].crm_notes, /m1[\s\S]*Hola[\s\S]*\n\nSOCIAL[\s\S]*m2[\s\S]*Precio\?/);
  await db.close();
});
