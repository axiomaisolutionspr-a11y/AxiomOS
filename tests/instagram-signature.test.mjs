import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  instagramMessagingEvents,
  instagramSignatureSecrets,
  isOwnInstagramMessage,
  summarizeInstagramPayload,
  verifyInstagramSignature,
} from "../app/lib/instagram-signature.mjs";

const body = JSON.stringify({ object: "instagram", entry: [] });
const sign = (k) => "sha256=" + createHmac("sha256", k).update(body).digest("hex");
const IG = "instagram-secret-123", FB = "facebook-secret-456";
const secrets = instagramSignatureSecrets({ INSTAGRAM_APP_SECRET: IG, META_APP_SECRET: FB });

test("accepts payload signed with Instagram app secret", () => {
  assert.deepEqual(verifyInstagramSignature(body, sign(IG), secrets), { valid: true, reason: "verified", matched: "INSTAGRAM_APP_SECRET" });
});
test("still accepts payload signed with META_APP_SECRET (previous behavior)", () => {
  assert.equal(verifyInstagramSignature(body, sign(FB), secrets).matched, "META_APP_SECRET");
});
test("works when INSTAGRAM_APP_SECRET is not configured yet", () => {
  const only = instagramSignatureSecrets({ META_APP_SECRET: FB });
  assert.equal(verifyInstagramSignature(body, sign(FB), only).valid, true);
  assert.equal(verifyInstagramSignature(body, sign(IG), only).reason, "signature_mismatch");
});
test("rejects wrong secret, tampered body, missing or malformed signature", () => {
  assert.equal(verifyInstagramSignature(body, sign("other-secret-789"), secrets).valid, false);
  assert.equal(verifyInstagramSignature(body + " ", sign(IG), secrets).valid, false);
  assert.equal(verifyInstagramSignature(body, null, secrets).reason, "missing_or_malformed_signature");
  assert.equal(verifyInstagramSignature(body, "sha256=abc", secrets).reason, "missing_or_malformed_signature");
});
test("rejects when no secrets configured", () => {
  assert.equal(verifyInstagramSignature(body, sign(IG), instagramSignatureSecrets({})).reason, "missing_secret");
});

test("extracts events from messaging[] and changes[field=messages]", () => {
  const entry = {
    id: "biz",
    messaging: [{ sender: { id: "u1" }, message: { text: "hola" } }],
    changes: [{ field: "messages", value: { sender: { id: "u2" }, message: { text: "test" } } }, { field: "comments", value: {} }],
  };
  assert.equal(instagramMessagingEvents(entry).length, 2);
  assert.deepEqual(instagramMessagingEvents({}), []);
});
test("detects own messages by is_echo or sender == business id", () => {
  const entry = { id: "biz" };
  assert.equal(isOwnInstagramMessage({ sender: { id: "biz" }, message: { text: "x" } }, entry), true);
  assert.equal(isOwnInstagramMessage({ sender: { id: "u1" }, message: { text: "x", is_echo: true } }, entry), true);
  assert.equal(isOwnInstagramMessage({ sender: { id: "u1" }, message: { text: "x" } }, entry), false);
});
test("summary has no ids or text", () => {
  const s = summarizeInstagramPayload({ object: "instagram", entry: [{ id: "biz", messaging: [{ sender: { id: "u1" }, message: { text: "secreto" } }, { read: { mid: "x" } }] }] });
  assert.deepEqual(s, { object: "instagram", entries: 1, messaging: 2, changes: [], kinds: ["text", "read"] });
  assert.ok(!JSON.stringify(s).includes("secreto") && !JSON.stringify(s).includes("u1"));
});
