"use server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";
function e164(value:string){const clean=value.trim();if(/^\+\d{8,15}$/.test(clean))return clean;const digits=clean.replace(/\D/g,"");if(digits.length===10)return `+1${digits}`;if(digits.length===11&&digits.startsWith("1"))return `+${digits}`;return null;}
export async function startSimpleCall(data:FormData):Promise<{ok:boolean;error?:string}>{
  const accessPin=process.env.AXIOMOS_CRM_ACCESS_PIN;
  const session=(await cookies()).get("axiomos_crm_session")?.value;
  if(!accessPin||!session)return {ok:false,error:"Tu sesión venció. Vuelve a entrar al CRM."};
  const expected=createHash("sha256").update(`axiomos-crm:${accessPin}`).digest("hex");
  if(session.length!==expected.length||!timingSafeEqual(Buffer.from(session),Buffer.from(expected)))return {ok:false,error:"Tu sesión venció. Vuelve a entrar al CRM."};
  const callPin=process.env.AXIOMOS_CRM_CALL_PIN;
  if(!callPin)return {ok:false,error:"El PIN de llamada no está configurado."};
  const provided=String(data.get("crm_call_pin")||"").trim();
  if(provided.length!==callPin.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(callPin)))return {ok:false,error:"PIN de llamada incorrecto."};
  const id=String(data.get("id")||"");
  if(!/^\d+$/.test(id))return {ok:false,error:"El contacto no es válido."};
  const apiKey=process.env.TELNYX_API_KEY,appId=process.env.TELNYX_TEXML_APP_ID,assistantId=process.env.TELNYX_AI_ASSISTANT_ID,from=process.env.TELNYX_FROM_NUMBER,db=process.env.DATABASE_URL;
  if(!apiKey||!appId||!assistantId||!from||!db)return {ok:false,error:"La conexión de llamadas no está completa en esta versión."};
  let submitted=false;
  try{
    const sql=neon(db);
    const rows=await sql`SELECT caller_name,caller_company,caller_phone,crm_notes FROM prospects WHERE id=${id} LIMIT 1`;
    const contact=rows[0];if(!contact)return {ok:false,error:"No se encontró el contacto."};
    const to=e164(String(contact.caller_phone||"")),origin=e164(from);
    if(!to||!origin)return {ok:false,error:"Revisa el teléfono registrado y el número de origen."};
    const name=String(contact.caller_name||"cliente").trim(),company=String(contact.caller_company||"").trim();
    const greeting=company?`Hola ${name}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios para ${company}. ¿Tienes un momento para conversar?`:`Hola ${name}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios. ¿Tienes un momento para conversar?`;
    submitted=true;
    const response=await fetch(`https://api.telnyx.com/v2/texml/ai_calls/${encodeURIComponent(appId)}`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({From:origin,To:to,AIAssistantId:assistantId,AIAssistantDynamicVariables:{call_direction:"outbound",prospect_id:id,prospect_name:name,prospect_company:company||"No disponible",crm_notes:contact.crm_notes||"No hay notas internas disponibles",outbound_greeting:greeting}}),cache:"no-store"});
    if(!response.ok)return {ok:false,error:`Telnyx rechazó iniciar la llamada (${response.status}).`};
    try {revalidatePath("/prospectos");revalidatePath("/prospectos/simple");} catch { /* La llamada ya fue aceptada; no sugerir repetirla. */ }
    return {ok:true};
  }catch{return {ok:false,error:submitted?"No pudimos confirmar si Telnyx inició la llamada. Revisa el historial antes de intentar otra vez.":"No se pudo consultar el contacto. Intenta otra vez."};}
}
