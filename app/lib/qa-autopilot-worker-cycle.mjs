/**
 * AxiomOS QA dry-run worker. Audits authoritative CRM followups and computes
 * synthetic reservation plans. NO SQL writes, network, provider adapter,
 * real recipient identifiers in output or production execution.
 */
import {runQaNoSendBatch} from "./qa-autopilot-no-send-batch.mjs";
import {evaluateDispatch} from "./autopilot-delivery-gates.mjs";
const frozen=(x)=>Object.freeze({...x,
  crmReasons:Object.freeze({...x.crmReasons}),
  rejectionReasons:Object.freeze({...x.rejectionReasons})});
const blocked=reason=>frozen({mode:"qa_worker_dry_run",reason,
  crmProcessed:0,crmReasons:{},simulatedClaims:0,
  duplicateCandidates:0,rejectionReasons:{},realSends:0,providerCalls:0});
export async function auditQaWorkerCycle({
 sql,environment="qa",syntheticCandidates=[],maxItems=100
}={}){
 if(environment!=="qa"||typeof sql!=="function")return blocked("qa_guard");
 if(!Array.isArray(syntheticCandidates)||syntheticCandidates.length>100)
  return blocked("invalid_candidates");
 const audit=await runQaNoSendBatch(sql,{environment,maxItems});
 if(audit.reason!=="audit_only_no_dispatch")
  return blocked("authoritative_audit_failed");
 const seen=new Set();
 const rejectionReasons=Object.create(null);
 let simulatedClaims=0,duplicateCandidates=0;
 for(const c of syntheticCandidates){
  // Only namespaced, synthetic fixtures can reach policy evaluation.
  if(!c||c.fixtureTag!=="AXIOMOS-QA-NO-SEND"||
     c.isSynthetic!==true||c.recipientAllowlisted!==true){
    rejectionReasons.invalid_fixture=(rejectionReasons.invalid_fixture||0)+1;
    continue;
  }
  const decision=evaluateDispatch(c);
  if(!decision.allowed){
    rejectionReasons[decision.reason]=(rejectionReasons[decision.reason]||0)+1;
    continue;
  }
  if(seen.has(decision.idempotencyKey)){duplicateCandidates++;continue}
  seen.add(decision.idempotencyKey);
  simulatedClaims++;
 }
 return frozen({mode:"qa_worker_dry_run",reason:"audit_complete_no_dispatch",
  crmProcessed:audit.processed,crmReasons:audit.counts,
  simulatedClaims,duplicateCandidates,rejectionReasons,
  realSends:0,providerCalls:0});
}
