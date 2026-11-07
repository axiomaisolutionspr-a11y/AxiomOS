/** Isolated offline QA kernel. No external messaging or real customer records. */
const channels=new Set(["whatsapp","messenger","instagram","telnyx","web"]);
const commercial=/\b(cotizaci[oó]n|precio|cost[oó]|comprar|contratar|demo|demostraci[oó]n|quote|price|buy|purchase|book|reservar|cita)\b/i;
const urgent=/\b(hoy|urgente|ahora|today|asap|inmediato)\b/i;
const human=/\b(humano|persona|representante|asesor|human|agent|representative)\b/i;
export function evaluateInbound(e){
  if(!e||typeof e!=="object"||Array.isArray(e)) throw Error("INVALID_EVENT");
  const {tenantId,eventId,channel,text,verified,simulated,contactKey}=e;
  if(simulated!==true||verified!==true)throw Error("UNTRUSTED_OR_NON_SYNTHETIC_EVENT");
  if(tenantId!=="axiomai-qa"||!channels.has(channel)||
    typeof eventId!=="string"||!/^[a-zA-Z0-9_-]{4,100}$/.test(eventId)||
    typeof contactKey!=="string"||!/^qa:[a-zA-Z0-9_-]{4,100}$/.test(contactKey)||
    typeof text!=="string"||!text.trim()||text.length>4000)throw Error("INVALID_EVENT");
  const handoff=human.test(text),interest=commercial.test(text),rush=urgent.test(text);
  return Object.freeze({tenantId,eventId,channel,contactKey,
    priority:handoff||(interest&&rush)?"high":interest?"medium":"normal",
    task:handoff?"human_handoff":interest?"prepare_followup":"review_inquiry",
    needsApproval:true,outboundPermitted:false,
    summary:handoff?"Solicita atención humana":interest?"Consulta comercial para revisión":"Consulta para revisión",
    reason:handoff?"HUMAN_REQUEST":interest&&rush?"COMMERCIAL_URGENT":interest?"COMMERCIAL_INTEREST":"INBOUND"});
}
/** Adapter must perform atomic idempotent persistence: processOnce(key,decision)
 * -> {inserted:boolean,receipt:string}. No completion is claimed without receipt.
 */
export async function processSyntheticInbound(e,adapter){
  const decision=evaluateInbound(e);
  if(!adapter||typeof adapter.processOnce!=="function")throw Error("PERSISTENCE_ADAPTER_REQUIRED");
  const result=await adapter.processOnce(`${decision.tenantId}:${decision.channel}:${decision.eventId}`,decision);
  if(!result||typeof result.inserted!=="boolean"||typeof result.receipt!=="string"||!result.receipt.trim())
    throw Error("UNVERIFIED_PERSISTENCE");
  return Object.freeze({...decision,inserted:result.inserted,receipt:result.receipt,
    status:result.inserted?"recorded":"duplicate"});
}
