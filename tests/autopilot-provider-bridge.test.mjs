import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync, sign, createHmac} from "node:crypto";
import {
  sendQaTestOnce, verifyTelnyxSignedEvent, verifyMetaSignedEvent,
  telnyxDeliveryEvents, whatsAppDeliveryEvents
} from "../app/lib/autopilot-provider-bridge.mjs";
const now="2026-11-09T16:00:00Z";
const job={
  environment:"qa", enabled:true,
  ownerAuthorized:true, ownerSessionValid:true,tenantId:"axiomai",
  queueId:"24",prospectId:"qa-synthetic-1",channel:"sms",purpose:"followup",
  status:"approved_for_test",isSynthetic:true,recipientAllowlisted:true,
  recipient:"+17872320132",body:"AxiomAI prueba autorizada sin datos reales.",
  containsSensitiveData:false,scheduledFor:"2026-11-09T15:00:00Z",
  consent:{state:"opt_in",channel:"sms",purpose:"followup",
    prospectId:"qa-synthetic-1",recordedAt:"2026-11-09T14:00:00Z",
    evidence:"Evidencia opt in QA"},optOutAfterConsent:false,
  globalSuppressed:false,lastContactAt:null,messagesInLast7Days:0,
  idempotencyKey:"axiomai:sms:24",claimedExactlyOnce:true,attempts:1
};
const config={scope:"qa",vercelEnvironment:"preview",enabled:true,
  recipient:"+17872320132",from:"+17875550001",telnyxApiKey:"fake-only-for-node-tests",
  dualhookApiKey:"fake-dualhook-for-node-tests",phoneNumberId:"12345678901"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const yes=()=>json({data:{id:"4031a1c0-c487-4db3-8b87-7ec1d04f7d9e"}});
test("Telnyx QA adapter accepts provider ID but does not claim delivered",async()=>{
  let calls=0;
  const r=await sendQaTestOnce({job,config,now,fetchImpl:async(url,opt)=>{
    calls++;
    assert.equal(url,"https://api.telnyx.com/v2/messages");
    assert.equal(JSON.parse(opt.body).to,"+17872320132");
    assert.equal(JSON.parse(opt.body).text,job.body);
    return yes();
  }});
  assert.equal(calls,1); assert.equal(r.state,"accepted");
  assert.equal(r.retryAllowed,false);assert.equal("delivered" in r,false);
});
for(const [name,delta,reason] of [
  ["production forbidden",{config:{...config,vercelEnvironment:"production"}},"qa_guard"],
  ["disabled flag",{config:{...config,enabled:false}},"qa_guard"],
  ["wrong recipient",{job:{...job,recipient:"+17875550002"}},"qa_guard"],
  ["no live claim",{job:{...job,claimedExactlyOnce:false}},"qa_guard"],
  ["replayed claim",{job:{...job,attempts:2}},"qa_guard"],
  ["revoked session",{job:{...job,ownerSessionValid:false}},"qa_guard"],
  ["denied consent",{job:{...job,consent:{...job.consent,state:"opt_out"}}},"no_current_opt_in"],
  ["recent optout",{job:{...job,optOutAfterConsent:true}},"suppressed"],
  ["rate limited",{job:{...job,messagesInLast7Days:2}},"rate_limit_7d"],
  ["night hours",{job:{...job,scheduledFor:"2026-11-08T15:00:00Z",
    consent:{...job.consent,recordedAt:"2026-11-08T14:00:00Z"}}},"quiet_hours"],
]){
  test(name+" makes no network call",async()=>{
    let calls=0;
    const r=await sendQaTestOnce({job:delta.job??job,config:delta.config??config,
      now:name==="night hours"?"2026-11-09T03:00:00Z":now,
      fetchImpl:async()=>{calls++;return yes();}});
    assert.equal(r.state,"blocked"); assert.equal(r.reason,reason); assert.equal(calls,0);
  });
}
test("HTTP 4xx is terminal rejected; no retries",async()=>{
 const r=await sendQaTestOnce({job,config,now,fetchImpl:async()=>json({errors:[]},400)});
 assert.equal(r.state,"rejected");assert.equal(r.retryAllowed,false);
});
test("HTTP 5xx is uncertain; no automatic retry",async()=>{
 const r=await sendQaTestOnce({job,config,now,fetchImpl:async()=>json({},503)});
 assert.equal(r.state,"uncertain");assert.equal(r.retryAllowed,false);
});
test("network timeout is uncertain; no automatic retry",async()=>{
 const r=await sendQaTestOnce({job,config,now,fetchImpl:async()=>{throw Error("timeout");}});
 assert.equal(r.state,"uncertain");assert.equal(r.retryAllowed,false);
});
test("accepted HTTP without provider ID is uncertain",async()=>{
 const r=await sendQaTestOnce({job,config,now,fetchImpl:async()=>json({data:{}})});
 assert.equal(r.state,"uncertain");
});
test("WhatsApp only uses approved template outside 24-hour inbound window",async()=>{
 const wa={...job,channel:"whatsapp",idempotencyKey:"axiomai:whatsapp:24",
   consent:{...job.consent,channel:"whatsapp"},templateApproved:true,templateName:"qa_test_approved"};
 let calls=0;
 const r=await sendQaTestOnce({job:wa,config,now,fetchImpl:async(url,opt)=>{
  calls++;assert.equal(url,"https://api.dualhook.com/v25.0/12345678901/messages");
  const body=JSON.parse(opt.body);
  assert.equal(body.type,"template");assert.equal(body.template.name,"qa_test_approved");
  return json({messages:[{id:"wamid.HBgMNTk3NzAw"}]});
 }});
 assert.equal(calls,1);assert.equal(r.state,"accepted");
});
test("WhatsApp text permitted only within confirmed 24h inbound window",async()=>{
 const wa={...job,channel:"whatsapp",idempotencyKey:"axiomai:whatsapp:24",
   consent:{...job.consent,channel:"whatsapp"},lastInboundWhatsAppAt:"2026-11-09T15:00:00Z"};
 const r=await sendQaTestOnce({job:wa,config,now,fetchImpl:async(_url,opt)=>{
  assert.equal(JSON.parse(opt.body).type,"text");
  return json({messages:[{id:"wamid.HBgMNTk3NzAw"}]});
 }});
 assert.equal(r.state,"accepted");
});
test("WhatsApp outside 24h without template is blocked before network",async()=>{
 const wa={...job,channel:"whatsapp",idempotencyKey:"axiomai:whatsapp:24",
   consent:{...job.consent,channel:"whatsapp"}};
 let calls=0;
 const r=await sendQaTestOnce({job:wa,config,now,fetchImpl:async()=>{calls++;return json({});}});
 assert.equal(r.reason,"whatsapp_template_required");assert.equal(calls,0);
});
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const publicKey64=publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
const ts="1794254400"; // 2026-11-09T16:00:00Z, verify with explicit clock
const body=JSON.stringify({data:{id:"event-123456789",event_type:"message.finalized",
  payload:{id:"message-12345678",to:[{status:"delivered"}]}}});
const signature=sign(null,Buffer.from(ts+"|"+body),privateKey).toString("base64");
test("Telnyx signed delivery passes Ed25519 verification",()=>{
 const clock=Number(ts)*1000;
 assert.equal(verifyTelnyxSignedEvent({rawBody:body,timestamp:ts,signature,publicKey:publicKey64,nowMs:clock}),true);
});
test("Telnyx tampered body rejected",()=>{
 assert.equal(verifyTelnyxSignedEvent({rawBody:body.replace("delivered","failed"),
  timestamp:ts,signature,publicKey:publicKey64,nowMs:Number(ts)*1000}),false);
});
test("Telnyx replay older than five minutes rejected",()=>{
 assert.equal(verifyTelnyxSignedEvent({rawBody:body,timestamp:ts,signature,
  publicKey:publicKey64,nowMs:Number(ts)*1000+301000}),false);
});
test("Telnyx unsigned rejected",()=>{
 assert.equal(verifyTelnyxSignedEvent({rawBody:body,timestamp:ts,signature:"",publicKey:publicKey64,nowMs:Number(ts)*1000}),false);
});
test("Telnyx parsed receipt is delivery verified only AFTER signature",()=>{
 const result=telnyxDeliveryEvents(body);
 assert.equal(result.length,1); assert.equal(result[0].status,"delivered");
 assert.equal(result[0].providerMessageId,"message-12345678");
 assert.equal(result[0].isFinal,true);
});
const secret="only-for-qa-sim-tests";
const metaBody=JSON.stringify({object:"whatsapp_business_account",entry:[{
 changes:[{field:"messages",value:{statuses:[{id:"wamid.HBgMNTk3NzAw",status:"delivered"}]}}]
}]});
const metaSignature="sha256="+createHmac("sha256",secret).update(metaBody).digest("hex");
test("Meta signed delivery webhook passes HMAC",()=>{
 assert.equal(verifyMetaSignedEvent({rawBody:metaBody,signature:metaSignature,appSecret:secret}),true);
});
test("Meta tampering rejected",()=>{
 assert.equal(verifyMetaSignedEvent({rawBody:metaBody+" ",signature:metaSignature,appSecret:secret}),false);
});
test("Meta forged signature rejected",()=>{
 assert.equal(verifyMetaSignedEvent({rawBody:metaBody,signature:"sha256="+"0".repeat(64),appSecret:secret}),false);
});
test("WhatsApp delivery event is extracted with stable dedupe key",()=>{
 const a=whatsAppDeliveryEvents(metaBody),b=whatsAppDeliveryEvents(metaBody);
 assert.equal(a.length,1);assert.equal(a[0].status,"delivered");
 assert.equal(a[0].eventKey,b[0].eventKey);
});
test("Unexpected webhook event types are ignored",()=>{
 assert.deepEqual(telnyxDeliveryEvents(JSON.stringify({data:{event_type:"call.answered"}})),[]);
 assert.deepEqual(whatsAppDeliveryEvents(JSON.stringify({object:"other"})),[]);
});
