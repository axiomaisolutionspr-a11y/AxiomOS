import test from "node:test";
import assert from "node:assert/strict";
import {auditQaWorkerCycle} from "../app/lib/qa-autopilot-worker-cycle.mjs";
const due="2026-11-09T16:00:00Z";
const candidate={
 fixtureTag:"AXIOMOS-QA-NO-SEND",
 now:due,environment:"qa",enabled:true,ownerAuthorized:true,ownerSessionValid:true,
 tenantId:"axiomai",queueId:"24",prospectId:"qa-synthetic-1",
 channel:"sms",purpose:"followup",status:"approved_for_test",
 isSynthetic:true,recipientAllowlisted:true,recipient:"+17875550123",
 body:"Synthetic safety exercise with no customer data.",containsSensitiveData:false,
 scheduledFor:"2026-11-09T15:00:00Z",
 consent:{state:"opt_in",channel:"sms",purpose:"followup",
  prospectId:"qa-synthetic-1",recordedAt:"2026-11-09T14:00:00Z",
  evidence:"Synthetic QA evidence"},
 optOutAfterConsent:false,globalSuppressed:false,lastContactAt:null,
 messagesInLast7Days:0,idempotencyKey:"axiomai:sms:24"
};
function crm({failure=false}={}){
 let calls=0;
 const sql=async(strings,...vals)=>{
  calls++;
  if(failure)throw Error("QA reader unavailable");
  const statement=strings.join("?").toLowerCase();
  if(statement.includes("select queue_id")&&!statement.includes("queue_id=cast"))
   return Array.from({length:8},(_,i)=>({queue_id:String(i+1)}));
  const id=String(vals[0]);
  return [{queue_id:id,tenant_id:"axiomai",channel:"whatsapp",
   purpose:"followup",status:"needs_review",
   permission_state:Number(id)<=2?"opt_out":null,
   has_evidence:Number(id)<=2,permission_recorded_at:due,review_decision:"none"}];
 };
 return {sql,get calls(){return calls}};
}
test("Read eight CRM followups and block all unconsented items",async()=>{
 const db=crm(),r=await auditQaWorkerCycle({sql:db.sql});
 assert.equal(r.crmProcessed,8);
 assert.equal(r.crmReasons.no_verifiable_consent,8);
 assert.equal(r.realSends,0);assert.equal(r.providerCalls,0);
 assert.equal(r.simulatedClaims,0);
 assert.equal(db.calls,9);
});
test("Synthetic fixture can produce one dry-run claim, never a send",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[candidate]});
 assert.equal(r.simulatedClaims,1);assert.equal(r.realSends,0);
 assert.equal(r.providerCalls,0);assert.equal(r.crmProcessed,8);
});
test("Duplicate synthetic idempotency key counted only once",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[candidate,{...candidate}]});
 assert.equal(r.simulatedClaims,1);assert.equal(r.duplicateCandidates,1);
});
test("Non-synthetic candidate rejected before policy eligibility",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[
  {...candidate,isSynthetic:false},{...candidate,fixtureTag:"production"}]});
 assert.equal(r.simulatedClaims,0);assert.equal(r.rejectionReasons.invalid_fixture,2);
});
test("Opt-out candidate never makes simulated claim",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[
  {...candidate,optOutAfterConsent:true}]});
 assert.equal(r.simulatedClaims,0);assert.equal(r.rejectionReasons.suppressed,1);
});
test("WhatsApp synthetic candidate requires window/template policy",async()=>{
 const wa={...candidate,channel:"whatsapp",idempotencyKey:"axiomai:whatsapp:24",
  consent:{...candidate.consent,channel:"whatsapp"}};
 const blocked=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[wa]});
 assert.equal(blocked.simulatedClaims,0);
 assert.equal(blocked.rejectionReasons.whatsapp_template_required,1);
 const allowed=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[
  {...wa,lastInboundWhatsAppAt:"2026-11-09T15:00:00Z"}]});
 assert.equal(allowed.simulatedClaims,1);
 assert.equal(allowed.realSends,0);
});
test("Disabled feature cannot reserve a synthetic job",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[
  {...candidate,enabled:false}]});
 assert.equal(r.rejectionReasons.feature_disabled,1);
 assert.equal(r.simulatedClaims,0);
});
test("Production mode forbids even reading CRM or computing claims",async()=>{
 const db=crm(),r=await auditQaWorkerCycle({sql:db.sql,environment:"production",
  syntheticCandidates:[candidate]});
 assert.equal(db.calls,0);assert.equal(r.simulatedClaims,0);
 assert.equal(r.realSends,0);assert.equal(r.reason,"qa_guard");
});
test("CRM error fails closed before planning synthetic claims",async()=>{
 const r=await auditQaWorkerCycle({sql:crm({failure:true}).sql,
  syntheticCandidates:[candidate]});
 assert.equal(r.reason,"authoritative_audit_failed");
 assert.equal(r.simulatedClaims,0);assert.equal(r.realSends,0);
});
test("Invalid fixture array or batch size fails closed",async()=>{
 const x=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:Array(101).fill(candidate)});
 assert.equal(x.reason,"invalid_candidates");
 const y=await auditQaWorkerCycle({sql:crm().sql,maxItems:0,syntheticCandidates:[candidate]});
 assert.equal(y.reason,"authoritative_audit_failed");
});
test("No PII, message bodies, phone numbers or credentials emitted",async()=>{
 const r=await auditQaWorkerCycle({sql:crm().sql,syntheticCandidates:[candidate]});
 const raw=JSON.stringify(r);
 for(const token of [candidate.body,candidate.recipient,candidate.prospectId,"appSecret",
  "providerMessageId","rawBody","token"])assert.equal(raw.includes(token),false);
 assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.crmReasons));
});
