/**
 * QA-only Autopilot simulated runtime. No fetch, no provider adapter, no writes.
 * Integrates CRM preflight, synthetic provider acceptance, verified callbacks,
 * deduplication, and terminal delivery-state handling in memory.
 *
 * A simulation result MUST NOT be interpreted as a production send approval.
 */
import {runQaNoSendBatch} from "./qa-autopilot-no-send-batch.mjs";
import {authenticateAndParse} from "./autopilot-webhook-verification.mjs";

const STATUSES=new Set(["accepted","sent","delivered","read","failed","unconfirmed"]);
const RANK={accepted:0,sent:1,delivered:2,read:3};
const KEY=/^QA-[A-Za-z0-9_-]{4,70}$/;
const MESSAGE=/^qa-[A-Za-z0-9._-]{8,120}$/;
const RECEIPT_LIMIT=100;
const EVENT_LIMIT=200;

function freshSummary(reason){
 return {mode:"qa_no_send",reason,dispatched:0,providerCalls:0,
   accepted:0,verifiedEvents:0,appliedEvents:0,duplicates:0,
   staleOrTerminal:0,unknownReceipts:0,rejectedSignatures:0,
   skippedUntrusted:0,crmProcessed:0,crmReasons:{},receipts:[]};
}
const finish=value=>Object.freeze({...value,
  crmReasons:Object.freeze({...value.crmReasons}),
  receipts:Object.freeze(value.receipts.map(x=>Object.freeze({...x})))});

/**
 * @param {object} options
 * @param {Function} options.sql Limited Neon reader, or a PostgreSQL synthetic
 *   test adapter. Never connect this to customer messaging credentials.
 * @param {Array} options.syntheticReceipts Synthetic accepted receipts only.
 * @param {Array} options.syntheticCallbacks Signed synthetic webhook fixtures.
 */
export async function simulateAutopilotE2E({
 sql,environment="qa",syntheticReceipts=[],syntheticCallbacks=[],
 maxItems=100
}={}){
 const result=freshSummary("qa_only");
 if(environment!=="qa"||typeof sql!=="function")return finish(result);
 if(!Array.isArray(syntheticReceipts)||syntheticReceipts.length>RECEIPT_LIMIT||
    !Array.isArray(syntheticCallbacks)||syntheticCallbacks.length>EVENT_LIMIT)
   return finish({...result,reason:"invalid_fixture_set"});

 const review=await runQaNoSendBatch(sql,{environment,maxItems});
 result.crmProcessed=review.processed;
 result.crmReasons=review.counts;
 if(review.reason!=="audit_only_no_dispatch")
   return finish({...result,reason:review.reason});
 result.reason="simulation_complete_no_send";

 const receipts=new Map();
 const uniqueKeys=new Set();
 for(const item of syntheticReceipts){
  if(item?.isSynthetic!==true||typeof item.testKey!=="string"||!KEY.test(item.testKey)||
     !["telnyx","whatsapp"].includes(item.provider)||
     typeof item.providerMessageId!=="string"||!MESSAGE.test(item.providerMessageId)||
     item.state!=="accepted"){
    result.skippedUntrusted++;
    continue;
  }
  const k=item.provider+":"+item.providerMessageId;
  if(receipts.has(k)||uniqueKeys.has(item.testKey)){
    result.skippedUntrusted++;
    continue;
  }
  receipts.set(k,{testKey:item.testKey,provider:item.provider,
    providerMessageId:item.providerMessageId,state:"accepted"});
  uniqueKeys.add(item.testKey);
 }
 result.accepted=receipts.size;
 const seen=new Set();
 for(const fixture of syntheticCallbacks){
  if(fixture?.isSynthetic!==true||!["telnyx","whatsapp"].includes(fixture.provider)||
    typeof fixture.testKey!=="string"||!KEY.test(fixture.testKey)){
   result.skippedUntrusted++;
   continue;
  }
  const signed=authenticateAndParse({
   provider:fixture.provider,rawBody:fixture.rawBody,headers:fixture.headers,
   telnyxPublicKey:fixture.telnyxPublicKey,
   metaAppSecret:fixture.metaAppSecret,nowMs:fixture.nowMs
  });
  if(!signed.authenticated){
   result.rejectedSignatures++;
   continue;
  }
  for(const event of signed.events){
   // Never accept a real provider identifier or unregistered synthetic ID.
   if(!MESSAGE.test(event.providerMessageId)){
     result.skippedUntrusted++;
     continue;
   }
   result.verifiedEvents++;
   const key=event.provider+":"+event.providerMessageId;
   const record=receipts.get(key);
   if(!record||record.testKey!==fixture.testKey){
     result.unknownReceipts++;
     continue;
   }
   const dedupe=event.provider+":"+event.eventKey;
   if(seen.has(dedupe)){
     result.duplicates++;
     continue;
   }
   seen.add(dedupe);
   const target=event.status==="delivery_failed"||event.status==="sending_failed"?
      "failed":event.status==="delivery_unconfirmed"?"unconfirmed":event.status;
   if(!STATUSES.has(target)){
     result.skippedUntrusted++;
     continue;
   }
   if(record.state==="failed"||record.state==="unconfirmed"||record.state==="read"||
     (record.state==="delivered"&&target!=="read")||
     (target==="sent"&&RANK[record.state]>=RANK.delivered)||
     (Object.hasOwn(RANK,target)&&RANK[target]<=RANK[record.state])){
     result.staleOrTerminal++;
     continue;
   }
   record.state=target;
   result.appliedEvents++;
  }
 }
 // Return only the test key and state; never include provider IDs, credentials,
 // phone numbers, content, or raw webhook payloads.
 result.receipts=Array.from(receipts.values(),r=>({testKey:r.testKey,
   provider:r.provider,state:r.state})).sort((a,b)=>a.testKey.localeCompare(b.testKey));
 return finish(result);
}
