/**
 * Pure verifier + parser for AxiomOS provider delivery events.
 * No HTTP client, credentials, dispatch, logging, DB access, or write actions.
 * Verifying a signature authenticates webhook origin, NOT message delivery.
 */
import {createHmac, timingSafeEqual, createPublicKey, verify as verifySignature, createHash} from "node:crypto";
const SPKI=Buffer.from("302a300506032b6570032100","hex");
const rawBytes=value=>Buffer.isBuffer(value)?value:typeof value==="string"?Buffer.from(value,"utf8"):Buffer.alloc(0);
function parse(raw){try{return JSON.parse(raw.toString("utf8"))}catch{return null}}
export function verifyTelnyxWebhook({rawBody,timestamp,signature,publicKey,nowMs=Date.now()}){
 try{
   const raw=rawBytes(rawBody);
   if(raw.length===0||raw.length>262144||typeof timestamp!=="string"||!/^[0-9]{10}$/.test(timestamp)||
      !Number.isFinite(nowMs)||Math.abs(nowMs-Number(timestamp)*1000)>300000||
      typeof signature!=="string"||typeof publicKey!=="string")return false;
   const sig=Buffer.from(signature,"base64"),key=Buffer.from(publicKey,"base64");
   if(sig.length!==64||key.length!==32)return false;
   const spki=createPublicKey({key:Buffer.concat([SPKI,key]),format:"der",type:"spki"});
   return verifySignature(null,Buffer.concat([Buffer.from(timestamp+"|"),raw]),spki,sig);
 }catch{return false}
}
export function verifyMetaWebhook({rawBody,signature,appSecret}){
 try{
  const raw=rawBytes(rawBody);
  if(raw.length===0||raw.length>262144||typeof appSecret!=="string"||appSecret.length<8||
     typeof signature!=="string"||!/^sha256=[a-fA-F0-9]{64}$/.test(signature))return false;
  const expected=createHmac("sha256",appSecret).update(raw).digest();
  const received=Buffer.from(signature.slice(7),"hex");
  return received.length===expected.length&&timingSafeEqual(received,expected);
 }catch{return false}
}
const TELNYX_STATUS=new Set(["sent","delivered","delivery_failed","sending_failed","delivery_unconfirmed"]);
const META_STATUS=new Set(["sent","delivered","read","failed"]);
export function parseVerifiedDeliveryEvents(provider,rawBody){
 const raw=rawBytes(rawBody);
 if(raw.length===0||raw.length>262144)return [];
 const body=parse(raw);
 if(!body)return [];
 const result=[];
 if(provider==="telnyx"){
  const d=body.data,s=d?.payload?.to?.[0]?.status??d?.payload?.status,id=d?.payload?.id;
  if(["message.finalized","message.sent"].includes(d?.event_type)&&
     typeof id==="string"&&/^[A-Za-z0-9._-]{8,150}$/.test(id)&&TELNYX_STATUS.has(s)){
   const key=(typeof d.id==="string"&&d.id.length>=8&&d.id.length<=150)?d.id:createHash("sha256").update(raw).digest("hex");
   result.push(Object.freeze({provider:"telnyx",providerMessageId:id,eventKey:key,status:s}));
  }
 }else if(provider==="whatsapp"&&body.object==="whatsapp_business_account"){
  const digest=createHash("sha256").update(raw).digest("hex");
  for(const entry of Array.isArray(body.entry)?body.entry:[]){
   for(const change of Array.isArray(entry?.changes)?entry.changes:[]){
    if(change.field!=="messages")continue;
    for(const s of Array.isArray(change.value?.statuses)?change.value.statuses:[]){
     if(typeof s.id==="string"&&s.id.length>=8&&s.id.length<=150&&META_STATUS.has(s.status)){
       result.push(Object.freeze({provider:"whatsapp",providerMessageId:s.id,eventKey:digest+":"+result.length,status:s.status}));
     }
     if(result.length>=100)return result;
    }
   }
  }
 }
 return result;
}
/** Never parse or persist events until the raw payload passes verification. */
export function authenticateAndParse({provider,rawBody,headers={},telnyxPublicKey,metaAppSecret,nowMs=Date.now()}){
 const valid=provider==="telnyx"?
  verifyTelnyxWebhook({rawBody,timestamp:headers["telnyx-timestamp"],signature:headers["telnyx-signature-ed25519"],publicKey:telnyxPublicKey,nowMs}):
  provider==="whatsapp"?
  verifyMetaWebhook({rawBody,signature:headers["x-hub-signature-256"],appSecret:metaAppSecret}):false;
 return Object.freeze({authenticated:valid,events:valid?parseVerifiedDeliveryEvents(provider,rawBody):[]});
}
