import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { telnyxVerificationQaEnabled, verifyTelnyxWebhook } from "../app/lib/telnyx-webhook-auth.mjs";

const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const key=publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
const raw='{"event_type":"conversation_insight_result","payload":{"qa":true}}';
const now=1_800_000_000;
function headers(body=raw,timestamp=String(now)) {
  return new Headers({"telnyx-timestamp":timestamp,
    "telnyx-signature-ed25519":sign(null,Buffer.from(`${timestamp}|${body}`),privateKey).toString("base64")});
}
test("accepts a signed exact raw payload with a fresh timestamp",()=>{
  assert.equal(verifyTelnyxWebhook(raw,headers(),key,now),true);
  assert.equal(verifyTelnyxWebhook(raw,headers(raw,String(now-300)),key,now),true);
});
test("rejects tampering, missing or malformed headers, stale and future timestamps",()=>{
  assert.equal(verifyTelnyxWebhook(raw+' ',headers(),key,now),false);
  assert.equal(verifyTelnyxWebhook(raw,new Headers(),key,now),false);
  assert.equal(verifyTelnyxWebhook(raw,headers(raw,String(now-301)),key,now),false);
  assert.equal(verifyTelnyxWebhook(raw,headers(raw,String(now+301)),key,now),false);
  assert.equal(verifyTelnyxWebhook(raw,headers(raw,'not-a-time'),key,now),false);
  assert.equal(verifyTelnyxWebhook(raw,headers(),"wrong",now),false);
});
test("enforcement is disabled outside an explicit Preview QA gate",()=>{
  assert.equal(telnyxVerificationQaEnabled({VERCEL_ENV:"preview",AXIOMOS_TELNYX_VERIFY_QA:"true"}),true);
  assert.equal(telnyxVerificationQaEnabled({VERCEL_ENV:"production",AXIOMOS_TELNYX_VERIFY_QA:"true"}),false);
  assert.equal(telnyxVerificationQaEnabled({VERCEL_ENV:"preview"}),false);
});
