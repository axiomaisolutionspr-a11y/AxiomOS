import test from "node:test";
import assert from "node:assert/strict";
import { qaTextMessages } from "../app/lib/whatsapp-qa-events.mjs";

const config = { wabaId: "111", phoneNumberId: "222", recipient: "15555550123" };
const event = () => ({ object: "whatsapp_business_account", entry: [{ id: "111", changes: [{ field: "messages", value: { metadata: { phone_number_id: "222" }, messages: [{ id: "wamid.abc123", from: "15555550123", type: "text", text: { body: " Hola " } }] } }] }] });

test("accepts only a text from the explicitly allowlisted QA sender and channel", () => {
  assert.deepEqual(qaTextMessages(event(), config), [{ id: "wamid.abc123", text: "Hola" }]);
  assert.deepEqual(qaTextMessages(event(), { ...config, recipient: "15555550124" }), []);
  assert.deepEqual(qaTextMessages(event(), { ...config, phoneNumberId: "999" }), []);
  assert.deepEqual(qaTextMessages(event(), { ...config, wabaId: "999" }), []);
  assert.deepEqual(qaTextMessages(event(), { ...config, recipient: "" }), []);
});

test("ignores statuses, nontext messages, malformed identifiers and oversized input", () => {
  for (const mutate of [m => { m.type = "image"; }, m => { m.id = "bad"; }, m => { m.text.body = "x".repeat(4001); }, m => { m.text.body = " "; }]) {
    const payload = event(); mutate(payload.entry[0].changes[0].value.messages[0]);
    assert.deepEqual(qaTextMessages(payload, config), []);
  }
  const payload = event(); delete payload.entry[0].changes[0].value.messages;
  assert.deepEqual(qaTextMessages(payload, config), []);
});
