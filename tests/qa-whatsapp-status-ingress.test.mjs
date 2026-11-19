import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {receiveQaWhatsAppStatus} from "../app/lib/qa-whatsapp-status-ingress.mjs";

const appSecret="synthetic-QA-only-meta-app-secret";
const waba="100001234567890";
const phoneNumberId="200009876543210";
const messageId="wamid.QAaaaaaaaaaaaaaa==";
const timestamp="1794320000";
function signed({account=waba,phone=phoneNumberId,status="delivered",id=messageId,
  time=timestamp,includeInbound=false,entries=null}={}){
 const rawBody=Buffer.from(JSON.stringify({object:"whatsapp_business_account",
  entry:entries??[{id:account,changes:[{field:"messages",value:{
   metadata:{phone_number_id:phone},statuses:[{id,status,timestamp:time}],
   ...(includeInbound?{messages:[{id:"wamid.synthetic-inbound",text:{body:"NOT FOR LOGGING"}}]}:{})
  }}]}]}));
 const signature="sha256="+createHmac("sha256",appSecret).update(rawBody).digest("hex");
 return {environment:"qa",method:"POST",rawBody,headers:{"x-hub-signature-256":signature},
  appSecret,expectedWabaId:waba,expectedPhoneNumberId:phoneNumberId};
}
function stub(value="EVENT_RECORDED"){
 const events=[];
 return {events,write:async event=>{events.push(event);return value}};
}
test("valid QA HMAC delivery reaches store without exposing recipient metadata",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed(),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,200);assert.equal(v.processed,1);assert.equal(s.events.length,1);
 assert.deepEqual(Object.keys(s.events[0]).sort(),["eventKey","provider","providerMessageId","status"].sort());
 assert.equal(s.events[0].provider,"dualhook");assert.equal(s.events[0].status,"delivered");
 assert.match(s.events[0].eventKey,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(v).includes(messageId),false);
});
test("bad HMAC fails before touching store",async()=>{
 const s=stub(),f=signed();
 const v=await receiveQaWhatsAppStatus({...f,headers:{"x-hub-signature-256":"sha256="+"0".repeat(64)},storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,401);assert.equal(s.events.length,0);
});
test("modified raw body fails HMAC",async()=>{
 const s=stub(),f=signed();
 const v=await receiveQaWhatsAppStatus({...f,rawBody:Buffer.concat([f.rawBody,Buffer.from(" ")]),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,401);assert.equal(s.events.length,0);
});
test("mismatched WABA is ignored after HMAC, not persisted",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed({account:"999999999999999"}),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,202);assert.equal(v.reason,"no_matching_qa_statuses");assert.equal(s.events.length,0);
});
test("mismatched phone number ID is ignored",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed({phone:"888888888888888"}),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,202);assert.equal(s.events.length,0);
});
test("missing QA IDs fails closed before any store calls",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed(),expectedWabaId:"",storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,503);assert.equal(s.events.length,0);
});
test("production environment blocks all status processing",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed(),environment:"production",storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,503);assert.equal(s.events.length,0);
});
test("missing QA persistence callback fails closed",async()=>{
 const v=await receiveQaWhatsAppStatus(signed());
 assert.equal(v.httpStatus,503);assert.equal(v.reason,"qa_store_missing");
});
test("same event has stable dedupe key even in a differently arranged batch",async()=>{
 const s=stub(),one=signed();
 const multi=signed({entries:[
  {id:waba,changes:[{field:"unrelated",value:{metadata:{phone_number_id:phoneNumberId}}},
   {field:"messages",value:{metadata:{phone_number_id:phoneNumberId},statuses:[
      {id:messageId,status:"delivered",timestamp}
   ]}}]}
 ]});
 await receiveQaWhatsAppStatus({...one,storeVerifiedStatus:s.write});
 await receiveQaWhatsAppStatus({...multi,storeVerifiedStatus:s.write});
 assert.equal(s.events.length,2);assert.equal(s.events[0].eventKey,s.events[1].eventKey);
});
test("identical receipt twice in one signed payload is deduped locally",async()=>{
 const entry={id:waba,changes:[{field:"messages",value:{metadata:{phone_number_id:phoneNumberId},
  statuses:[{id:messageId,status:"delivered",timestamp},
   {id:messageId,status:"delivered",timestamp}]}}]};
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed({entries:[entry]}),storeVerifiedStatus:s.write});
 assert.equal(v.processed,1);assert.equal(s.events.length,1);assert.equal(v.ignored,1);
});
test("replayed receipt deduplicated by database callback",async()=>{
 const s=stub("DUPLICATE_EVENT"),v=await receiveQaWhatsAppStatus({...signed(),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,200);assert.equal(v.duplicates,1);
});
test("unknown provider message ID does not create a new message",async()=>{
 const s=stub("UNKNOWN_MESSAGE_ID"),v=await receiveQaWhatsAppStatus({...signed(),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,200);assert.equal(v.processed,0);assert.equal(v.ignored,1);
});
test("store outage returns retryable 503 rather than false success",async()=>{
 const v=await receiveQaWhatsAppStatus({...signed(),storeVerifiedStatus:async()=>{throw Error("secret db error")}});
 assert.equal(v.httpStatus,503);assert.equal(v.ok,false);
 assert.equal(JSON.stringify(v).includes("secret"),false);
});
test("signed inbound customer message is ignored, never treated as receipt",async()=>{
 const s=stub(),v=await receiveQaWhatsAppStatus({...signed({includeInbound:true}),storeVerifiedStatus:s.write});
 assert.equal(v.processed,1);assert.equal(s.events.length,1);
 assert.equal(JSON.stringify(v).includes("NOT FOR LOGGING"),false);
});
test("missing timestamp, malformed ID and unsupported status are rejected",async()=>{
 for(const [id,status,time] of [[messageId,"delivered",undefined],["short","read",timestamp],
 [messageId,"invalid",timestamp]]){
  const s=stub();
  const f=signed({id,status,time:time===undefined?"":time});
  const v=await receiveQaWhatsAppStatus({...f,storeVerifiedStatus:s.write});
  assert.equal(v.httpStatus,202);assert.equal(s.events.length,0);
 }
});
test("oversize signed body rejected before HMAC",async()=>{
 const s=stub(),f=signed();
 const v=await receiveQaWhatsAppStatus({...f,rawBody:Buffer.alloc(262145),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,413);assert.equal(s.events.length,0);
});
test("unexpected callback result never counts as accepted delivery",async()=>{
 const s=stub("UNEXPECTED"),v=await receiveQaWhatsAppStatus({...signed(),storeVerifiedStatus:s.write});
 assert.equal(v.httpStatus,503);assert.equal(v.ok,false);
});
test("no supported sender, network client or Meta token in module exports",async()=>{
 const m=await import("../app/lib/qa-whatsapp-status-ingress.mjs");
 assert.deepEqual(Object.keys(m),["receiveQaWhatsAppStatus"]);
});
