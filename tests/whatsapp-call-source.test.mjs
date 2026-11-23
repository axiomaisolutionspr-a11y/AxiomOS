import assert from "node:assert/strict";
import test from "node:test";
import {callSourceFor, isWhatsappCall, WHATSAPP_CALL_SOURCE, PSTN_CALL_SOURCE} from "../app/lib/whatsapp-call-source.ts";

const waNumber = "+17875550199";

test("calls to the dedicated WhatsApp number are tagged as WhatsApp", () => {
  assert.equal(callSourceFor({from: "+17875550121", to: "+1 (787) 555-0199"}, waNumber), WHATSAPP_CALL_SOURCE);
  assert.equal(callSourceFor({from: "+17875550121", telnyx_agent_target: "17875550199"}, waNumber), WHATSAPP_CALL_SOURCE);
});

test("explicit WhatsApp markers are tagged even without the env number", () => {
  assert.equal(isWhatsappCall({from: "whatsapp:+17875550121", to: "+17875550100"}, undefined), true);
  assert.equal(isWhatsappCall({channel: "WhatsApp"}, undefined), true);
});

test("regular phone calls keep the existing receptionist source", () => {
  assert.equal(callSourceFor({from: "+17875550121", to: "+17875550100"}, waNumber), PSTN_CALL_SOURCE);
  assert.equal(callSourceFor({from: "+17875550121", to: "+17875550199"}, undefined), PSTN_CALL_SOURCE);
  assert.equal(callSourceFor(null, waNumber), PSTN_CALL_SOURCE);
  assert.equal(callSourceFor({to: "199"}, "199"), PSTN_CALL_SOURCE);
});
