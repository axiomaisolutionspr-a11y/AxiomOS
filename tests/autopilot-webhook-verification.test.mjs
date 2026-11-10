import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign,createHmac} from "node:crypto";
import {authenticateAndParse,verifyTelnyxWebhook,verifyMetaWebhook,parseVerifiedDeliveryEvents} from "../app/lib/autopilot-webhook-verification.mjs";
const pair=generateKeyPairSync("ed25519");
const pub=pair.publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
const t=String(Math.floor(Date.now()/1000));
const sms=Buffer.from(JSON.stringify({data:{id:"synthetic-event-12345",event_type:"message.finalized",payload:{id:"synthetic-message-12345",to:[{status:"delivered"}]}}}));
const signature=sign(null,Buffer.concat([Buffer.from(t+"|"),sms]),pair.privateKey).toString("base64");
const smsOpts={provider:"telnyx",rawBody:sms,headers:{"telnyx-timestamp":t,"telnyx-signature-ed25519":signature},telnyxPublicKey:pub};
const metaSecret="synthetic-secret-not-production";
const wa=Buffer.from(JSON.stringify({object:"whatsapp_business_account",entry:[{changes:[{field:"messages",value:{statuses:[{id:"wamid.synthetic12345",status:"delivered"}]}}]}]}));
const waSig="sha256="+createHmac("sha256",metaSecret).update(wa).digest("hex");
const waOpts={provider:"whatsapp",rawBody:wa,headers:{"x-hub-signature-256":waSig},metaAppSecret:metaSecret};
test("Telnyx signed real-byte synthetic body yields one delivery state",()=>{
 const r=authenticateAndParse(smsOpts);
 assert.equal(r.authenticated,true);assert.equal(r.events.length,1);assert.equal(r.events[0].status,"delivered");
});
test("Telnyx altered body rejected before event parsing",()=>{
 const r=authenticateAndParse({...smsOpts,rawBody:Buffer.concat([sms,Buffer.from(" ")])});
 assert.equal(r.authenticated,false);assert.deepEqual(r.events,[]);
});
test("Telnyx timestamp replay older than 5 minutes rejected",()=>{
 const r=authenticateAndParse({...smsOpts,nowMs:Number(t)*1000+300001});
 assert.equal(r.authenticated,false);assert.equal(r.events.length,0);
});
test("Telnyx missing signature rejected",()=>{
 assert.equal(verifyTelnyxWebhook({...smsOpts,timestamp:t,signature:"",publicKey:pub}),false);
});
test("Telnyx 256KiB body limit enforced",()=>{
 assert.equal(verifyTelnyxWebhook({rawBody:Buffer.alloc(262145),timestamp:t,signature,publicKey:pub}),false);
});
test("Telnyx wrong signature key rejected",()=>{
 const another=generateKeyPairSync("ed25519").publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
 assert.equal(verifyTelnyxWebhook({rawBody:sms,timestamp:t,signature,publicKey:another}),false);
});
test("WhatsApp HMAC signed synthetic event accepted",()=>{
 const r=authenticateAndParse(waOpts);
 assert.equal(r.authenticated,true);assert.equal(r.events.length,1);assert.equal(r.events[0].status,"delivered");
});
test("WhatsApp altered body fails HMAC before extraction",()=>{
 const r=authenticateAndParse({...waOpts,rawBody:Buffer.concat([wa,Buffer.from(" ")])});
 assert.equal(r.authenticated,false);assert.deepEqual(r.events,[]);
});
test("WhatsApp missing HMAC rejected",()=>{
 assert.equal(verifyMetaWebhook({rawBody:wa,signature:"",appSecret:metaSecret}),false);
});
test("WhatsApp forged HMAC rejected",()=>{
 assert.equal(verifyMetaWebhook({rawBody:wa,signature:"sha256="+"0".repeat(64),appSecret:metaSecret}),false);
});
test("Unknown or malformed provider payload produces no events",()=>{
 assert.deepEqual(parseVerifiedDeliveryEvents("unknown",sms),[]);
 assert.deepEqual(parseVerifiedDeliveryEvents("whatsapp",Buffer.from("{bad json")),[]);
});
test("Identical WhatsApp replay produces stable event key for DB deduplication",()=>{
 const first=authenticateAndParse(waOpts),again=authenticateAndParse(waOpts);
 assert.equal(first.events[0].eventKey,again.events[0].eventKey);
});
test("Mixed WhatsApp messages and status changes return status events only",()=>{
 const obj=JSON.parse(wa.toString());
 obj.entry[0].changes[0].value.messages=[{id:"incoming-1",text:{body:"no private data"}}];
 const raw=Buffer.from(JSON.stringify(obj));
 const sig="sha256="+createHmac("sha256",metaSecret).update(raw).digest("hex");
 const r=authenticateAndParse({...waOpts,rawBody:raw,headers:{"x-hub-signature-256":sig}});
 assert.equal(r.events.length,1);assert.equal(r.events[0].providerMessageId,"wamid.synthetic12345");
});
test("No sender, fetch or network client is exported",async()=>{
 const mod=await import("../app/lib/autopilot-webhook-verification.mjs");
 assert.deepEqual(Object.keys(mod).sort(),["authenticateAndParse","parseVerifiedDeliveryEvents","verifyMetaWebhook","verifyTelnyxWebhook"].sort());
});
