"use server";
import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialOfferWriterDatabase, commercialMember } from "../../../../lib/commercial-identity";
const BASE="/prospectos/autopilot/seguimientos/prueba-sms";
function finish(msg:string):never {redirect(BASE+"?estado="+encodeURIComponent(msg));}
export async function sendOneAuthorizedSmsTest() {
 if(process.env.VERCEL_ENV!=="production"||process.env.AXIOMOS_SMS_CERT_TEST_ENABLED!=="true") finish("Prueba no habilitada");
 const to=process.env.AXIOMOS_SMS_CERT_TO?.replace(/[^0-9]/g,"");
 if(to!=="17872320132") finish("Destinatario de prueba incorrecto");
 const reader=commercialIdentityDatabase(), writer=commercialOfferWriterDatabase(), auth=commercialIdentityAuth();
 if(!reader||!writer||!auth) finish("Acceso no disponible");
 const {data,error}=await auth.getSession();
 if(error||!data?.user) redirect("/prospectos/autopilot/acceso");
 const membership=await commercialMember(reader,data.user.id);
 if(membership?.role!=="owner") finish("Solo el propietario puede ejecutar la prueba");
 if(!process.env.TELNYX_SMS_FROM||!process.env.TELNYX_API_KEY) finish("Telnyx no esta configurado");
 let claimed=false;
 try { const rows=await writer`SELECT axiomos_commercial.claim_one_sms_cert_test(CAST(${data.user.id} AS uuid)) AS claimed`;claimed=rows[0]?.claimed===true; }
 catch(err) {const dbError=err as {code?:string;message?:string;detail?:string;hint?:string};
  console.error("SMS_CERT_CLAIM_FAILED",{code:dbError?.code??"unknown",message:String(dbError?.message??"").slice(0,350),hint:String(dbError?.hint??"").slice(0,180)});finish("No se pudo reservar la prueba");}
 if(!claimed) finish("La prueba ya se intento una vez. No se volvera a enviar");
 try {
  const result=await fetch("https://api.telnyx.com/v2/messages",{
   method:"POST",headers:{Authorization:"Bearer "+process.env.TELNYX_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({from:process.env.TELNYX_SMS_FROM,to:"+"+to,text:"AxiomAI Solutions - PRUEBA AUTORIZADA de SMS Autopilot (09-nov-2026). Sin enlaces. No responder."}),
   signal:AbortSignal.timeout(12000),cache:"no-store"
  });
  const json=await result.json() as {data?:{id?:string};errors?:unknown};
  console.info("SMS_CERT_TELNYX_RESULT",{status:result.status,id:typeof json.data?.id==="string"?json.data.id.slice(0,60):null});
  if(!result.ok) finish("Telnyx rechazo la prueba. HTTP "+result.status+". No reintentar automaticamente");
  finish("Telnyx acepto el SMS. La entrega final requiere verificar el telefono y webhook");
 }catch(e) {
  // Next redirects throw a control flow exception; preserve it.
  if(e&&typeof e==="object"&&"digest" in e&&String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
  console.error("SMS_CERT_SEND_FAILED",(e as {name?:string})?.name??"unknown");
  finish("No se pudo verificar la aceptacion por Telnyx. No se reintentara");
 }
}
