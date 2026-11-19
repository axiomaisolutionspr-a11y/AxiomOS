/**
 * QA-only Meta WhatsApp receipt ingress. NO outbound API, keys, customers or
 * database credentials. Verify HMAC over the RAW bytes before parsing.
 * Explicitly constrain WABA and phone-number IDs to this QA integration.
 * For a real connection, pass only a dedicated QA writer that checks an
 * accepted, preexisting receipt. Never upsert unknown messages.
 */
import {createHash} from "node:crypto";
import {verifyMetaWebhook} from "./autopilot-webhook-verification.mjs";

const ID=/^[A-Za-z0-9._=:+/-]{8,255}$/;
const ACCOUNT_ID=/^[0-9]{5,30}$/;
const VALID_STATUS=new Set(["sent","delivered","read","failed"]);
const fail=(httpStatus,reason)=>Object.freeze({
  httpStatus,ok:false,reason,processed:0,duplicates:0,ignored:0
});
function canonicalKey(account,phoneNumberId,messageId,status,timestamp){
 return createHash("sha256")
   .update(["meta-status-v1",account,phoneNumberId,messageId,status,timestamp].join("|"))
   .digest("hex");
}
export async function receiveQaWhatsAppStatus({
 environment="qa",method="POST",rawBody,headers={},appSecret,
 expectedWabaId,expectedPhoneNumberId,storeVerifiedStatus
}={}){
 if(environment!=="qa")return fail(503,"qa_disabled");
 if(method!=="POST")return fail(405,"method_not_allowed");
 if(typeof storeVerifiedStatus!=="function")return fail(503,"qa_store_missing");
 if(!ACCOUNT_ID.test(expectedWabaId??"")||!ACCOUNT_ID.test(expectedPhoneNumberId??""))
  return fail(503,"qa_identity_missing");
 if(!Buffer.isBuffer(rawBody)||rawBody.length===0||rawBody.length>262144)
  return fail(413,"invalid_body_size");
 const signature=headers["x-hub-signature-256"];
 if(!verifyMetaWebhook({rawBody,signature,appSecret}))
  return fail(401,"invalid_signature");
 let body;
 try{body=JSON.parse(rawBody.toString("utf8"))}
 catch{return fail(400,"invalid_json")}
 if(body?.object!=="whatsapp_business_account"||!Array.isArray(body.entry))
  return fail(202,"ignored_event");
 const batch=[];
 const seen=new Set();
 let ignored=0;
 for(const entry of body.entry){
  if(entry?.id!==expectedWabaId){ignored++;continue}
  for(const change of Array.isArray(entry.changes)?entry.changes:[]){
   if(change?.field!=="messages"||change?.value?.metadata?.phone_number_id!==expectedPhoneNumberId){
    ignored++;continue;
   }
   const statuses=change?.value?.statuses;
   if(!Array.isArray(statuses))continue;
   for(const row of statuses){
    const messageId=row?.id,status=row?.status,timestamp=row?.timestamp;
    if(typeof messageId!=="string"||!ID.test(messageId)||
       !VALID_STATUS.has(status)||typeof timestamp!=="string"||
       !/^\d{10,11}$/.test(timestamp)){ignored++;continue}
    const eventKey=canonicalKey(expectedWabaId,expectedPhoneNumberId,messageId,status,timestamp);
    if(seen.has(eventKey)){ignored++;continue}
    seen.add(eventKey);
    if(batch.length>=100)return fail(413,"too_many_statuses");
    batch.push({provider:"dualhook",providerMessageId:messageId,eventKey,status});
   }
  }
 }
 if(batch.length===0)return Object.freeze({
  httpStatus:202,ok:true,reason:"no_matching_qa_statuses",
  processed:0,duplicates:0,ignored
 });
 let processed=0,duplicates=0;
 for(const event of batch){
  let outcome;
  try{outcome=await storeVerifiedStatus(event)}
  catch{return Object.freeze({httpStatus:503,ok:false,reason:"qa_store_unavailable",
    processed,duplicates,ignored})}
  if(outcome==="EVENT_RECORDED"||outcome==="ALREADY_AT_STATUS"||
     outcome==="IGNORED_TERMINAL_OR_STALE"){processed++;continue}
  if(outcome==="DUPLICATE_EVENT"){duplicates++;continue}
  if(outcome==="UNKNOWN_MESSAGE_ID"){ignored++;continue}
  return Object.freeze({httpStatus:503,ok:false,reason:"qa_store_unexpected_result",
     processed,duplicates,ignored});
 }
 return Object.freeze({httpStatus:200,ok:true,reason:"qa_statuses_processed",
   processed,duplicates,ignored});
}
