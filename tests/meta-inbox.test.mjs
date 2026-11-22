import assert from "node:assert/strict";
import test from "node:test";
import { parseConversations, sendRequest, validateOutgoing, normalizeChannel, graphErrorSummary } from "../app/lib/meta-inbox.mjs";

test("validates outgoing messages", () => {
  assert.equal(validateOutgoing({ channel: "instagram", recipientId: "1234567890", text: " hola " }).value.text, "hola");
  assert.equal(validateOutgoing({ channel: "x", recipientId: "1234567890", text: "a" }).error, "invalid_channel");
  assert.equal(validateOutgoing({ channel: "messenger", recipientId: "abc", text: "a" }).error, "invalid_recipient");
  assert.equal(validateOutgoing({ channel: "messenger", recipientId: "1234567890", text: "  " }).error, "empty_message");
  assert.equal(validateOutgoing({ channel: "messenger", recipientId: "1234567890", text: "a".repeat(1001) }).error, "message_too_long");
  assert.equal(normalizeChannel("messenger"), "messenger");
  assert.equal(normalizeChannel("evil"), "instagram");
});

test("builds send requests per channel", () => {
  const ig = sendRequest({ channel: "instagram", recipientId: "111111", text: "hi" });
  assert.equal(ig.url, "https://graph.instagram.com/v26.0/me/messages");
  assert.deepEqual(ig.body, { recipient: { id: "111111" }, message: { text: "hi" } });
  const fb = sendRequest({ channel: "messenger", recipientId: "222222", text: "hi", pageId: "999" });
  assert.equal(fb.url, "https://graph.facebook.com/v25.0/999/messages");
  assert.equal(fb.body.messaging_type, "RESPONSE");
});

test("parses conversations, finds the customer and orders messages oldest first", () => {
  const payload = { data: [{
    id: "conv1", updated_time: "2026-11-22T03:37:00+0000",
    participants: { data: [{ id: "17841438864868032", username: "axiomaisolutions" }, { id: "555555", username: "alx_0099" }] },
    messages: { data: [
      { id: "m2", created_time: "2026-11-22T03:38:00+0000", from: { id: "17841438864868032" }, message: "reply" },
      { id: "m1", created_time: "2026-11-22T03:37:00+0000", from: { id: "555555" }, message: "Hola" },
    ] },
  }, { id: "conv2", participants: { data: [{ id: "17841438864868032" }] } }] };
  const [c, ...rest] = parseConversations(payload, ["17841438864868032"]);
  assert.equal(rest.length, 0);
  assert.equal(c.customerId, "555555");
  assert.equal(c.customerName, "alx_0099");
  assert.deepEqual(c.messages.map((m) => [m.text, m.fromBusiness]), [["Hola", false], ["reply", true]]);
  assert.deepEqual(parseConversations(null, []), []);
});

test("graph error summary has no message text", () => {
  assert.deepEqual(graphErrorSummary({ error: { code: 10, error_subcode: 2018278, message: "secret token xyz" } }, 400), { status: 400, code: 10, subcode: 2018278 });
});
