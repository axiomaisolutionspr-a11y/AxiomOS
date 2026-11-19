/**
 * Telnyx QA-only, verified inbound -> persistence adapter.
 * Never sends messages and never handles customer outbound work.
 *
 * Provide a least-privilege write function for the QA branch ONLY.
 * The caller must pass exact raw request bytes (not parsed JSON).
 */
import {verifyTelnyxWebhook} from "./autopilot-webhook-verification.mjs";

const ID=/^[A-Za-z0-9-]{8,100}$/;
const ALLOWED=new Map([
  ["message.sent",new Set(["sent"])],
  ["message.finalized",new Set(["delivered","delivery_failed","sending_failed","delivery_unconfirmed"])]
]);
const fail=(status,reason)=>Object.freeze({status,accepted:false,reason});
export async function receiveQaTelnyxEvent({
  method="POST",rawBody,headers={},publicKey,storeVerifiedEvent,environment="qa",
  nowMs=Date.now()
}={}){
  if(environment!=="qa")return fail(503,"qa_disabled");
  if(method!=="POST")return fail(405,"method_not_allowed");
  if(typeof storeVerifiedEvent!=="function")return fail(503,"qa_store_not_configured");
  const raw=Buffer.isBuffer(rawBody)?rawBody:Buffer.alloc(0);
  if(raw.length<1||raw.length>262144)return fail(413,"invalid_body_size");
  const timestamp=headers["telnyx-timestamp"];
  const signature=headers["telnyx-signature-ed25519"];
  if(!verifyTelnyxWebhook({rawBody:raw,timestamp,signature,publicKey,nowMs}))
    return fail(401,"invalid_signature");
  let payload;
  try {payload=JSON.parse(raw.toString("utf8"));}catch{return fail(400,"invalid_json")}
  const type=payload?.data?.event_type;
  const status=payload?.data?.payload?.to?.[0]?.status??payload?.data?.payload?.status;
  const providerMessageId=payload?.data?.payload?.id;
  const eventKey=payload?.data?.id;
  if(!ALLOWED.get(type)?.has(status)||typeof providerMessageId!=="string"||
     typeof eventKey!=="string"||!ID.test(providerMessageId)||!ID.test(eventKey))
    return fail(202,"ignored_event");
  let result;
  try {
    result=await storeVerifiedEvent({
      providerMessageId,eventKey,eventType:type,status,
      evidenceSource:"ed25519_verified_qa_receiver"
    });
  }catch{
    // Non-2xx permits provider retry of the *same* event. SQL is idempotent.
    // Do not log PII or payloads.
    return fail(503,"qa_store_unavailable");
  }
  if(result==="VERIFIED_EVENT_RECORDED")
    return Object.freeze({status:200,accepted:true,reason:"recorded"});
  if(result==="DUPLICATE_EVENT")
    return Object.freeze({status:200,accepted:true,reason:"duplicate"});
  if(result==="UNKNOWN_OR_UNACCEPTED_PROBE")
    return fail(202,"not_a_registered_probe");
  if(result==="INVALID_EVENT")
    return fail(202,"invalid_event");
  return fail(503,"qa_store_unexpected_result");
}
