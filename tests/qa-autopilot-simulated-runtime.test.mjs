import test from "node:test";
import assert from "node:assert/strict";
import {createHmac,generateKeyPairSync,sign} from "node:crypto";
import {simulateAutopilotE2E} from "../app/lib/qa-autopilot-simulated-runtime.mjs";

const keyPair=generateKeyPairSync("ed25519");
const telnyxPublicKey=keyPair.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
const metaAppSecret="synthetic-qa-secret-no-provider";
const stamp=String(Math.floor(Date.now()/1000));
const smsId="qa-sms-message-00001";
const waId="qa-wa-message-000001";

function crmSql({rows=[{queue_id:"42"}],permission="opt_out",failure=false}={}){
 let reads=0;
 const sql=async(strings,...params)=>{
  reads++;
  if(failure)throw Error("synthetic QA database failure");
  const q=strings.join("?").toLowerCase();
  if(q.includes("select queue_id")&&!q.includes("queue_id=cast"))return rows;
  return [{queue_id:String(params[0]),tenant_id:"axiomai",channel:"whatsapp",
    purpose:"followup",status:"needs_review",permission_state:permission,
    permission_recorded_at:new Date().toISOString(),has_evidence:true,
    review_decision:"none"}];
 };
 return {sql,get reads(){return reads}};
}
function smsEvent(status="delivered",eventId="qa-event-00000001",providerMessageId=smsId){
 const rawBody=Buffer.from(JSON.stringify({data:{id:eventId,event_type:"message.finalized",
   payload:{id:providerMessageId,to:[{status}]}}}));
 const signature=sign(null,Buffer.concat([Buffer.from(stamp+"|"),rawBody]),keyPair.privateKey).toString("base64");
 return {isSynthetic:true,testKey:"QA-SMS1",provider:"telnyx",rawBody,
   headers:{"telnyx-timestamp":stamp,"telnyx-signature-ed25519":signature},
   telnyxPublicKey,nowMs:Number(stamp)*1000};
}
function waEvent(status="delivered",providerMessageId=waId){
 const rawBody=Buffer.from(JSON.stringify({object:"whatsapp_business_account",entry:[
   {changes:[{field:"messages",value:{statuses:[{id:providerMessageId,status}]}}]}
 ]}));
 const signature="sha256="+createHmac("sha256",metaAppSecret).update(rawBody).digest("hex");
 return {isSynthetic:true,testKey:"QA-WA11",provider:"whatsapp",rawBody,
   headers:{"x-hub-signature-256":signature},metaAppSecret};
}
const smsReceipt={isSynthetic:true,testKey:"QA-SMS1",provider:"telnyx",
  providerMessageId:smsId,state:"accepted"};
const waReceipt={isSynthetic:true,testKey:"QA-WA11",provider:"whatsapp",
  providerMessageId:waId,state:"accepted"};
const run=(options={})=>simulateAutopilotE2E({sql:crmSql().sql,...options});

test("QA end-to-end: blocked CRM consent + signed synthetic SMS receipt; zero real sends",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],syntheticCallbacks:[smsEvent()]});
 assert.equal(r.mode,"qa_no_send");
 assert.equal(r.crmProcessed,1);
 assert.equal(r.crmReasons.no_verifiable_consent,1);
 assert.equal(r.dispatched,0);assert.equal(r.providerCalls,0);
 assert.equal(r.appliedEvents,1);
 assert.deepEqual(r.receipts,[{testKey:"QA-SMS1",provider:"telnyx",state:"delivered"}]);
 assert.equal(JSON.stringify(r).includes(smsId),false);
});
test("Without QA environment, no reads, receipt processing or sends",async()=>{
 const db=crmSql();
 const r=await simulateAutopilotE2E({sql:db.sql,environment:"production",
   syntheticReceipts:[smsReceipt],syntheticCallbacks:[smsEvent()]});
 assert.equal(db.reads,0);assert.equal(r.reason,"qa_only");
 assert.equal(r.dispatched,0);assert.equal(r.providerCalls,0);
 assert.deepEqual(r.receipts,[]);
});
test("Invalid fixture sets are rejected before database access",async()=>{
 const db=crmSql();
 const r=await simulateAutopilotE2E({sql:db.sql,syntheticCallbacks:Array(201).fill({})});
 assert.equal(r.reason,"invalid_fixture_set");assert.equal(db.reads,0);
});
test("Database read failure rejects simulation and never processes receipt fixtures",async()=>{
 const r=await run({sql:crmSql({failure:true}).sql,
   syntheticReceipts:[smsReceipt],syntheticCallbacks:[smsEvent()]});
 assert.equal(r.reason,"database_unavailable");assert.equal(r.accepted,0);
});
test("Duplicate signed event changes synthetic receipt only once",async()=>{
 const e=smsEvent();
 const r=await run({syntheticReceipts:[smsReceipt],syntheticCallbacks:[e,e]});
 assert.equal(r.appliedEvents,1);assert.equal(r.duplicates,1);
 assert.equal(r.receipts[0].state,"delivered");assert.equal(r.providerCalls,0);
});
test("Forged Telnyx signature is rejected before any state change",async()=>{
 const e=smsEvent();
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[{...e,headers:{...e.headers,"telnyx-signature-ed25519":"AAAA"}}]});
 assert.equal(r.rejectedSignatures,1);assert.equal(r.appliedEvents,0);
 assert.equal(r.receipts[0].state,"accepted");
});
test("Expired Telnyx timestamp cannot produce a receipt transition",async()=>{
 const e=smsEvent();
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[{...e,nowMs:Number(stamp)*1000+301000}]});
 assert.equal(r.rejectedSignatures,1);assert.equal(r.receipts[0].state,"accepted");
});
test("Known synthetic ID with forged fixture key does not reconcile",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[{...smsEvent(),testKey:"QA-WRONG"}]});
 assert.equal(r.unknownReceipts,1);assert.equal(r.receipts[0].state,"accepted");
});
test("Unknown synthetic provider ID is ignored without an upsert",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[smsEvent("delivered","qa-event-00000010","qa-other-message-111")]});
 assert.equal(r.unknownReceipts,1);assert.equal(r.receipts.length,1);
 assert.equal(r.receipts[0].state,"accepted");
});
test("Delivered followed by stale sent event never regresses",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[smsEvent("delivered","qa-event-00000101"),
                       smsEvent("sent","qa-event-00000102")]});
 assert.equal(r.appliedEvents,1);assert.equal(r.staleOrTerminal,1);
 assert.equal(r.receipts[0].state,"delivered");
});
test("Failure remains terminal even if a later event says delivered",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],
   syntheticCallbacks:[smsEvent("delivery_failed","qa-event-00000301"),
                       smsEvent("delivered","qa-event-00000302")]});
 assert.equal(r.appliedEvents,1);assert.equal(r.staleOrTerminal,1);
 assert.equal(r.receipts[0].state,"failed");
});
test("Valid signed WhatsApp delivered/read progression uses synthetic receipts only",async()=>{
 const r=await run({syntheticReceipts:[waReceipt],
   syntheticCallbacks:[waEvent("delivered"),waEvent("read")]});
 assert.equal(r.appliedEvents,2);
 assert.equal(r.receipts[0].state,"read");
 assert.equal(r.dispatched,0);
});
test("Tampered WhatsApp event fails HMAC and cannot update receipt",async()=>{
 const e=waEvent("read");
 const r=await run({syntheticReceipts:[waReceipt],
   syntheticCallbacks:[{...e,rawBody:Buffer.concat([e.rawBody,Buffer.from(" ")])}]});
 assert.equal(r.rejectedSignatures,1);
 assert.equal(r.receipts[0].state,"accepted");
});
test("Synthetic fixture cannot impersonate a real provider message ID",async()=>{
 const r=await run({syntheticReceipts:[{...smsReceipt,providerMessageId:"4031a1c2-50cd-4f1c-bcd3-3193b2a8de7c"}],
   syntheticCallbacks:[smsEvent()]});
 assert.equal(r.skippedUntrusted,1);
 assert.equal(r.accepted,0);assert.equal(r.receipts.length,0);
});
test("Provider credentials and raw message text never appear in output",async()=>{
 const r=await run({syntheticReceipts:[waReceipt],syntheticCallbacks:[waEvent()]});
 const body=JSON.stringify(r);
 for(const token of [metaAppSecret,waId,"recipient","phone","rawBody","signature","Authorization"])
   assert.equal(body.includes(token),false);
});
test("All simulated receipts are immutable and result has zero send functions",async()=>{
 const r=await run({syntheticReceipts:[smsReceipt],syntheticCallbacks:[smsEvent()]});
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.isFrozen(r.receipts),true);
 assert.equal(Object.isFrozen(r.receipts[0]),true);
 assert.deepEqual(Object.keys(await import("../app/lib/qa-autopilot-simulated-runtime.mjs")),["simulateAutopilotE2E"]);
});
