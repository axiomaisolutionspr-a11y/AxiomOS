import test from "node:test";
import assert from "node:assert/strict";
import {inspectQaFollowup} from "../app/lib/qa-followup-readonly.mjs";

const recent=new Date(Date.now()-3600_000).toISOString();
const row={queue_id:"42",tenant_id:"axiomai",channel:"whatsapp",purpose:"followup",
  status:"needs_review",scheduled_for:recent,permission_state:"opt_in",
  permission_recorded_at:recent,has_evidence:true,review_decision:"reviewed_only"};
function fake(data=[row]){
 let calls=0,query="",args=[];
 const sql=async(strings,...vars)=>{calls++;query=strings.join("$");args=vars;return data;};
 return {sql,get calls(){return calls},get query(){return query},get args(){return args}};
}
test("QA reads authoritative CRM queue, permission ledger, and review decision",async()=>{
 const f=fake();const out=await inspectQaFollowup(f.sql,"42");
 assert.equal(f.calls,1);assert.deepEqual(f.args,["42"]);
 assert.match(f.query,/followup_queue/);assert.match(f.query,/followup_contact_permissions/);
 assert.match(f.query,/followup_review_decisions/);assert.match(f.query,/ORDER BY p.recorded_at DESC,p.id DESC/);
 assert.equal(out.reason,"human_review_only_no_dispatch");assert.equal(out.allowed,false);
});
test("No personal information, drafts, bodies or phone numbers are queried or returned",async()=>{
 const f=fake([{...row,caller_name:"secret",caller_phone:"+17870000000",
    draft_body:"secret body",evidence_source:"secret evidence"}]);
 const out=await inspectQaFollowup(f.sql,42);
 assert.equal(out.allowed,false);
 for(const token of ["caller_name","caller_phone","draft_body","phone","message","body"])
   assert.equal(f.query.includes(token),false);
 for(const field of ["caller_name","caller_phone","draft_body","evidence_source","scheduled_for"])
   assert.equal(Object.hasOwn(out,field),false);
});
test("Production mode cannot call the QA reader",async()=>{
 const f=fake();const out=await inspectQaFollowup(f.sql,42,{environment:"production"});
 assert.equal(out.reason,"qa_guard");assert.equal(f.calls,0);
});
for(const bad of ["","0","-1","abc","42 OR 1=1","42.0",null,undefined,"9999999999999999999999"]){
 test("Reject invalid queue id "+String(bad),async()=>{
  const f=fake();const out=await inspectQaFollowup(f.sql,bad);
  assert.equal(out.reason,"invalid_queue_id");assert.equal(f.calls,0);
 });
}
test("Missing queue cannot produce approval",async()=>{
 const f=fake([]);const out=await inspectQaFollowup(f.sql,42);
 assert.equal(out.reason,"queue_not_found");assert.equal(out.allowed,false);
});
test("Query failure fails closed and never raises a send",async()=>{
 const out=await inspectQaFollowup(async()=>{throw Error("db offline")},42);
 assert.equal(out.reason,"authoritative_read_unavailable");assert.equal(out.allowed,false);
});
test("Cross-tenant data fails closed",async()=>{
 const out=await inspectQaFollowup(fake([{...row,tenant_id:"other"}]).sql,42);
 assert.equal(out.reason,"tenant_mismatch");assert.equal(out.allowed,false);
});
test("Mismatched row identifier fails closed",async()=>{
 const out=await inspectQaFollowup(fake([{...row,queue_id:"99"}]).sql,42);
 assert.equal(out.reason,"tenant_mismatch");assert.equal(out.allowed,false);
});
for(const status of ["blocked","cancelled"]){
 test("Queue "+status+" stays blocked",async()=>{
  const out=await inspectQaFollowup(fake([{...row,status}]).sql,42);
  assert.equal(out.reason,"blocked_or_cancelled");assert.equal(out.allowed,false);
 });
}
test("Recorded human block stays blocked",async()=>{
 const out=await inspectQaFollowup(fake([{...row,review_decision:"blocked"}]).sql,42);
 assert.equal(out.reason,"blocked_or_cancelled");
});
for(const state of ["opt_out","unknown",null]){
 test("Latest consent "+state+" blocks",async()=>{
  const out=await inspectQaFollowup(fake([{...row,permission_state:state}]).sql,42);
  assert.equal(out.reason,"no_verifiable_consent");assert.equal(out.allowed,false);
 });
}
test("Missing consent evidence blocks",async()=>{
 const out=await inspectQaFollowup(fake([{...row,has_evidence:false}]).sql,42);
 assert.equal(out.reason,"no_verifiable_consent");
});
test("Consent older than 90 days blocks",async()=>{
 const old=new Date(Date.now()-91*86400_000).toISOString();
 const out=await inspectQaFollowup(fake([{...row,permission_recorded_at:old}]).sql,42);
 assert.equal(out.reason,"consent_time_invalid");
});
test("Future consent time blocks",async()=>{
 const future=new Date(Date.now()+3600_000).toISOString();
 const out=await inspectQaFollowup(fake([{...row,permission_recorded_at:future}]).sql,42);
 assert.equal(out.reason,"consent_time_invalid");
});
test("Latest consent is separate by channel and purpose",async()=>{
 const f=fake();await inspectQaFollowup(f.sql,42);
 assert.match(f.query,/p.channel=q.channel AND p.purpose=q.purpose/);
});
test("Even an unexpected approved status cannot dispatch",async()=>{
 const out=await inspectQaFollowup(fake([{...row,status:"approved"}]).sql,42);
 assert.equal(out.allowed,false);assert.equal(out.reason,"human_review_only_no_dispatch");
});
