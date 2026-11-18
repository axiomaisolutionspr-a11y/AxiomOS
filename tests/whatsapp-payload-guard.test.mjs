import test from "node:test";
import assert from "node:assert/strict";
import { assessWhatsAppPayload } from "../app/lib/whatsapp-payload-guard.js";

const expected = { wabaId: "111", phoneNumberId: "222" };
const legit = {
  object: "whatsapp_business_account",
  entry: [{ id: "111", changes: [{ field: "messages", value: { metadata: { phone_number_id: "222" }, messages: [{ id: "wamid.X" }] } }] }],
};

test("accepts a legitimate Dualhook/Meta message payload", () => {
  assert.deepEqual(assessWhatsAppPayload(legit, expected), { valid: true, reasons: [] });
});

test("rejects forged payload for another WABA or number", () => {
  const forged = structuredClone(legit);
  forged.entry[0].id = "999";
  forged.entry[0].changes[0].value.metadata.phone_number_id = "888";
  const r = assessWhatsAppPayload(forged, expected);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes("waba_mismatch") && r.reasons.includes("phone_number_mismatch"));
});

test("rejects wrong object, unknown field and missing phone id on messages", () => {
  const bad = { object: "page", entry: [{ id: "111", changes: [{ field: "feed", value: {} }, { field: "messages", value: {} }] }] };
  const r = assessWhatsAppPayload(bad, expected);
  assert.ok(["unexpected_object", "field_not_allowed", "phone_number_missing"].every((x) => r.reasons.includes(x)));
});

test("template status updates without phone id are allowed", () => {
  const p = { object: "whatsapp_business_account", entry: [{ id: "111", changes: [{ field: "message_template_status_update", value: {} }] }] };
  assert.equal(assessWhatsAppPayload(p, expected).valid, true);
});

test("without configured expectations only shape is checked (no false blocks)", () => {
  assert.equal(assessWhatsAppPayload(legit, {}).valid, true);
});
