/**
 * AxiomOS QA provider bridge. No routes or scheduled jobs call this module.
 * Callers must verify the owner, load consent from the server, and atomically
 * claim a synthetic QA job. Never pass a browser-authored candidate.
 * Production is deliberately unreachable with this bridge.
 */
import {createHmac, createHash, timingSafeEqual, createPublicKey, verify as verifySignature} from "node:crypto";
import {evaluateDispatch} from "./autopilot-delivery-gates.mjs";

const TEST_RECIPIENT = "+17872320132";
const TELNYX_ENDPOINT = "https://api.telnyx.com/v2/messages";
const DUALHOOK_HOST = "https://api.dualhook.com";
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function text(value) { return typeof value === "string" ? value : ""; }
function bytes(value) { return Buffer.isBuffer(value) ? value : Buffer.from(text(value)); }
function reject(reason) { return Object.freeze({state:"blocked", reason}); }
function uncertain(reason) { return Object.freeze({state:"uncertain", reason, retryAllowed:false}); }

function verifyQaJob(job, config, now) {
  if (!job || !config || config.scope !== "qa" ||
      config.vercelEnvironment !== "preview" || config.enabled !== true ||
      config.recipient !== TEST_RECIPIENT || job.recipient !== TEST_RECIPIENT ||
      job.isSynthetic !== true || job.recipientAllowlisted !== true ||
      job.claimedExactlyOnce !== true || job.attempts !== 1 ||
      job.ownerSessionValid !== true || job.ownerAuthorized !== true) return reject("qa_guard");
  const decision = evaluateDispatch({
    ...job, now, environment:"qa", enabled:true
  });
  return decision.allowed ? {state:"eligible"} : reject(decision.reason);
}

function responseBodyJson(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

async function postOnce(url, requestBody, key, fetchImpl) {
  if (typeof key !== "string" || key.length < 8 || typeof fetchImpl !== "function")
    return reject("provider_not_configured");
  let response;
  try {
    response = await fetchImpl(url, {
      method:"POST", cache:"no-store", redirect:"error",
      headers:{Authorization:"Bearer " + key, "Content-Type":"application/json"},
      body:JSON.stringify(requestBody),
      signal:AbortSignal.timeout(12000),
    });
  } catch { return uncertain("transport_unknown"); }
  // A server failure does not prove the carrier did not accept the attempt.
  if (response.status >= 500 || response.status === 408 || response.status === 429)
    return uncertain("provider_response_unknown");
  let raw="";
  try { raw=await response.text(); } catch { return uncertain("unreadable_provider_response"); }
  if (raw.length > 64000) return uncertain("oversized_provider_response");
  const payload=responseBodyJson(raw);
  if (!response.ok) return {state:"rejected",reason:"provider_http_" + response.status,retryAllowed:false};
  if (!payload) return uncertain("provider_receipt_missing");
  return {state:"http_accepted",payload};
}

/** An API receipt is NOT proof of device delivery. No automatic retries. */
export async function sendQaTestOnce({job,config,now,fetchImpl=fetch}) {
  const gate=verifyQaJob(job,config,now);
  if (gate.state !== "eligible") return gate;
  let receipt;
  if (job.channel === "sms") {
    if (!/^\+[1-9]\d{7,14}$/.test(text(config.from)) ||
        !text(config.telnyxApiKey)) return reject("sms_settings_missing");
    receipt=await postOnce(TELNYX_ENDPOINT,{
      from:config.from,to:TEST_RECIPIENT,text:job.body
    },config.telnyxApiKey,fetchImpl);
    if (receipt.state!=="http_accepted") return receipt;
    const id=receipt.payload?.data?.id;
    return typeof id==="string" && /^[a-zA-Z0-9-]{8,100}$/.test(id)
      ? {state:"accepted",channel:"sms",providerMessageId:id,retryAllowed:false}
      : uncertain("sms_receipt_id_missing");
  }
  if (job.channel === "whatsapp") {
    if (!/^\d{5,25}$/.test(text(config.phoneNumberId)) || !text(config.dualhookApiKey))
      return reject("whatsapp_settings_missing");
    const inbound = job.lastInboundWhatsAppAt
      ? new Date(job.lastInboundWhatsAppAt) : null;
    const nowDate = new Date(now);
    const withinWindow= inbound && Number.isFinite(inbound.valueOf()) &&
      nowDate>=inbound && nowDate-inbound<24*3600*1000;
    const body=withinWindow
      ? {messaging_product:"whatsapp",recipient_type:"individual",to:TEST_RECIPIENT.replace("+",""),
        type:"text",text:{preview_url:false,body:job.body}}
      : {messaging_product:"whatsapp",recipient_type:"individual",to:TEST_RECIPIENT.replace("+",""),
        type:"template",template:{name:job.templateName,language:{code:config.templateLanguage ?? "es"}}};
    const endpoint=DUALHOOK_HOST+"/v25.0/"+config.phoneNumberId+"/messages";
    receipt=await postOnce(endpoint,body,config.dualhookApiKey,fetchImpl);
    if (receipt.state!=="http_accepted") return receipt;
    const id=receipt.payload?.messages?.[0]?.id;
    return typeof id==="string" && id.length>=8 && id.length<=150
      ? {state:"accepted",channel:"whatsapp",providerMessageId:id,retryAllowed:false}
      : uncertain("whatsapp_receipt_id_missing");
  }
  return reject("invalid_channel");
}

/** Telnyx: signature = Ed25519(timestamp + "|" + exact raw JSON bytes). */
export function verifyTelnyxSignedEvent({rawBody,signature,timestamp,publicKey,nowMs=Date.now()}) {
  try {
    if (!/^\d{10}$/.test(text(timestamp)) ||
        Math.abs(nowMs-Number(timestamp)*1000)>300000 ||
        typeof signature!=="string" || signature.length>200 ||
        typeof publicKey!=="string" || publicKey.length>100) return false;
    const key=Buffer.from(publicKey,"base64");
    const sig=Buffer.from(signature,"base64");
    const raw=bytes(rawBody);
    if (key.length!==32 || sig.length!==64 || raw.length>262144 || raw.length===0) return false;
    const spki=createPublicKey({key:Buffer.concat([SPKI_PREFIX,key]),format:"der",type:"spki"});
    return verifySignature(null,Buffer.concat([Buffer.from(timestamp+"|"),raw]),spki,sig);
  } catch {return false;}
}

/** Meta/WhatsApp: HMAC SHA-256 of the exact raw payload, not reserialized JSON. */
export function verifyMetaSignedEvent({rawBody,signature,appSecret}) {
  try {
    if (!/^sha256=[a-f0-9]{64}$/i.test(text(signature)) ||
        !text(appSecret) || appSecret.length<8) return false;
    const raw=bytes(rawBody);
    if (!raw.length || raw.length>3145728) return false;
    const expected=createHmac("sha256",appSecret).update(raw).digest();
    const provided=Buffer.from(signature.slice(7),"hex");
    return provided.length===expected.length && timingSafeEqual(provided,expected);
  } catch {return false;}
}

const TELNYX_FINAL=new Set(["delivered","delivery_failed","sending_failed","delivery_unconfirmed"]);
export function telnyxDeliveryEvents(rawBody) {
  try {
    const data=responseBodyJson(bytes(rawBody).toString())?.data;
    if (!data || !["message.finalized","message.sent"].includes(data.event_type)) return [];
    const id=data.payload?.id;
    if (typeof id!=="string" || id.length<8 || id.length>150) return [];
    const s=data.payload?.to?.[0]?.status ?? data.payload?.status;
    if (typeof s!=="string" || !(TELNYX_FINAL.has(s) || s==="sent")) return [];
    const key=typeof data.id==="string" && data.id.length<=150 ? data.id
      : createHash("sha256").update(bytes(rawBody)).digest("hex");
    return [{provider:"telnyx",providerMessageId:id,eventKey:key,status:s,isFinal:TELNYX_FINAL.has(s)}];
  } catch {return [];}
}

const META_STATES=new Set(["sent","delivered","read","failed"]);
export function whatsAppDeliveryEvents(rawBody) {
  try {
    const parsed=responseBodyJson(bytes(rawBody).toString());
    if (parsed?.object!=="whatsapp_business_account") return [];
    const digest=createHash("sha256").update(bytes(rawBody)).digest("hex");
    const result=[];
    for(const entry of (Array.isArray(parsed.entry)?parsed.entry:[])) {
      for(const change of (Array.isArray(entry.changes)?entry.changes:[])) {
        if(change.field!=="messages") continue;
        for(const item of (Array.isArray(change.value?.statuses)?change.value.statuses:[])) {
          if(typeof item.id!=="string" || item.id.length>150 || item.id.length<8 ||
             !META_STATES.has(item.status)) continue;
          result.push({provider:"whatsapp",providerMessageId:item.id,
            eventKey:digest+":"+result.length,status:item.status,
            isFinal:item.status==="delivered" || item.status==="read" || item.status==="failed"});
        }
      }
    }
    return result.slice(0,100);
  } catch {return [];}
}
