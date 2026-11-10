import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {receiveQaTelnyxEvent} from "../app/lib/qa-telnyx-ingress.mjs";

const pair=generateKeyPairSync("ed25519");
const publicKey=pair.publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
const stamp=String(Math.floor(Date.now()/1000));
const pId="qa-message-00000001";
const eventId="qa-event-00000001";
function fixture(eventType="message.finalized",status="delivered",overrides={}){
 const rawBody=Buffer.from(JSON.stringify({data:{
   id:eventId,event_type:eventType,payload:{id:pId,to:[{status}]}
 }}));
 const signature=sign(null,Buffer.concat([Buffer.from(stamp+"|"),rawBody]),pair.privateKey).toString("base64");
 return {method:"POST",environment:"qa",rawBody,publicKey,
   nowMs:Number(stamp)*1000,
   headers:{"telnyx-timestamp":stamp,"telnyx-signature-ed25519":signature},
   ...overrides};
}
function spy(returnValue="VERIFIED_EVENT_RECORDED"){
 let calls=[];
 return {calls,storeVerifiedEvent:async row=>{calls.push(row);return returnValue}};
}
test("Real raw-body signature is verified before persistence",async()=>{
 const s=spy();
 const r=await receiveQaTelnyxEvent({...fixture(),storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,200);assert.equal(r.reason,"recorded");assert.equal(s.calls.length,1);
 assert.deepEqual(s.calls[0],{
   providerMessageId:pId,eventKey:eventId,eventType:"message.finalized",
   status:"delivered",evidenceSource:"ed25519_verified_qa_receiver"});
});
test("An exact duplicate is acknowledged but never treated as a second delivery",async()=>{
 const s=spy("DUPLICATE_EVENT");
 const r=await receiveQaTelnyxEvent({...fixture(),storeVerifiedEvent:s.storeVerifiedEvent});
 assert.deepEqual({status:r.status,reason:r.reason},{status:200,reason:"duplicate"});
});
test("Modified payload with unchanged signature is rejected before store",async()=>{
 const s=spy(),f=fixture();
 const r=await receiveQaTelnyxEvent({...f,rawBody:Buffer.concat([f.rawBody,Buffer.from(" ")]),storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,401);assert.equal(s.calls.length,0);
});
test("Expired timestamps are rejected without database writes",async()=>{
 const s=spy(),f=fixture();
 const r=await receiveQaTelnyxEvent({...f,nowMs:f.nowMs+301000,storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,401);assert.equal(s.calls.length,0);
});
test("Missing signature rejected",async()=>{
 const s=spy(),f=fixture();
 const r=await receiveQaTelnyxEvent({...f,headers:{"telnyx-timestamp":stamp},storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,401);assert.equal(s.calls.length,0);
});
test("Without isolated QA store configuration, fail closed",async()=>{
 const r=await receiveQaTelnyxEvent(fixture());
 assert.equal(r.status,503);assert.equal(r.reason,"qa_store_not_configured");
});
test("Environment production cannot process event even with valid signature",async()=>{
 const s=spy(),r=await receiveQaTelnyxEvent({...fixture(),environment:"production",storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,503);assert.equal(s.calls.length,0);
});
test("Database error yields retryable 503 and never claims successful persistence",async()=>{
 const r=await receiveQaTelnyxEvent({...fixture(),storeVerifiedEvent:async()=>{throw Error("db offline")}});
 assert.equal(r.status,503);assert.equal(r.accepted,false);
});
test("Unknown message ID is ignored without creating new probe",async()=>{
 const r=await receiveQaTelnyxEvent({...fixture(),storeVerifiedEvent:async()=> "UNKNOWN_OR_UNACCEPTED_PROBE"});
 assert.equal(r.status,202);assert.equal(r.accepted,false);
});
test("Method mismatch is rejected",async()=>{
 const s=spy(),r=await receiveQaTelnyxEvent({...fixture(),method:"GET",storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,405);assert.equal(s.calls.length,0);
});
test("Unknown event type or invalid status never reaches persistence",async()=>{
 for(const [type,status] of [["call.answered","delivered"],["message.sent","delivered"],["message.finalized","sent"]]){
   const s=spy(),f=fixture(type,status);
   const r=await receiveQaTelnyxEvent({...f,storeVerifiedEvent:s.storeVerifiedEvent});
   assert.equal(r.status,202);assert.equal(s.calls.length,0);
 }
});
test("A verified malformed JSON is rejected after signature verification",async()=>{
 const s=spy(),rawBody=Buffer.from("{invalid"),signature=sign(null,Buffer.concat([Buffer.from(stamp+"|"),rawBody]),pair.privateKey).toString("base64");
 const r=await receiveQaTelnyxEvent({...fixture(),rawBody,headers:{"telnyx-timestamp":stamp,"telnyx-signature-ed25519":signature},storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,400);assert.equal(s.calls.length,0);
});
test("Oversized request rejected",async()=>{
 const s=spy(),r=await receiveQaTelnyxEvent({...fixture(),rawBody:Buffer.alloc(262145),storeVerifiedEvent:s.storeVerifiedEvent});
 assert.equal(r.status,413);assert.equal(s.calls.length,0);
});
test("Opaque store error is not returned or logged",async()=>{
 const r=await receiveQaTelnyxEvent({...fixture(),storeVerifiedEvent:async()=> "INTERNAL_SECRET"});
 assert.equal(r.status,503);assert.equal(JSON.stringify(r).includes("INTERNAL_SECRET"),false);
});
