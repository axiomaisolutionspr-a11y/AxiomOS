"use server";
import {redirect} from "next/navigation";
import {commercialIdentityAuth} from "../../../lib/commercial-identity-auth";
import {commercialIdentityDatabase,commercialOfferWriterDatabase,commercialMember} from "../../../lib/commercial-identity";

const ROOT="/prospectos/autopilot/qa-e2e";
const TO="+17872320132";
const ENDPOINT="https://api.telnyx.com/v2/messages";
const WEBHOOK="https://axiomos-qa-telnyx-webhook.vercel.app/api/telnyx";
function done(code:string):never { redirect(ROOT+"?firma="+encodeURIComponent(code)); }

export async function executeOneSignedTelnyxProbe() {
 if(process.env.VERCEL_ENV!=="preview" ||
  process.env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED!=="true" ||
  process.env.AXIOMOS_QA_TELNYX_SIGNED_PROBE_ENABLED!=="true") done("disabled");
 const auth=commercialIdentityAuth(),reader=commercialIdentityDatabase(),writer=commercialOfferWriterDatabase();
 if(!auth||!reader||!writer) done("not_configured");
 const {data,error}=await auth.getSession();
 if(error||!data?.user?.id) done("not_authenticated");
 const member=await commercialMember(reader,data.user.id);
 if(member?.role!=="owner") done("not_owner");
 const apiKey=process.env.TELNYX_API_KEY;
 const from=process.env.TELNYX_SMS_FROM;
 if(!apiKey||!from||!/^\+[1-9]\d{7,14}$/.test(from)) done("provider_unavailable");
 let id="",outcome="reconcile_manually";
 try {
  const rows=await writer`SELECT id,recipient,body,webhook_url,approved_at
    FROM axiomos_commercial.qa_telnyx_signed_probe_claim(CAST(${data.user.id} AS uuid))`;
  const item=rows[0];
  if(!item) done("not_claimable");
  id=String(item.id??"");
  if(!/^\d{1,18}$/.test(id)||item.recipient!==TO||item.webhook_url!==WEBHOOK ||
    typeof item.body!=="string"||item.body.length>160) done("invalid_claim");
  let result:"accepted"|"rejected"|"uncertain"="uncertain";
  let messageId:string|null=null;
  try {
   const response=await fetch(ENDPOINT,{
    method:"POST",cache:"no-store",redirect:"error",
    headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,to:TO,text:item.body,
      webhook_url:WEBHOOK
    }),
    signal:AbortSignal.timeout(12000)
   });
   if(response.ok){
    const receipt=await response.json() as {data?:{id?:unknown}};
    if(typeof receipt?.data?.id==="string" &&
      /^[A-Za-z0-9-]{8,100}$/.test(receipt.data.id)){
     result="accepted";messageId=receipt.data.id;
    }
   } else if(response.status>=400 && response.status<500 &&
     ![408,409,429].includes(response.status)) {
    result="rejected";
   }
  }catch{
   result="uncertain";
  }
  const settled=await writer`SELECT axiomos_commercial.qa_telnyx_signed_probe_finish(
    CAST(${id} AS bigint),${result},${messageId}) AS result`;
  outcome=settled[0]?.result==="RECORDED_NO_RETRY"?result:"reconcile_manually";
 } catch(e) {
  if(e&&typeof e==="object"&&"digest" in e&&
   String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
  console.error("AXIOMOS_QA_SIGNED_PROBE_ERROR",{claimed:!!id});
  if(id)try{
   await writer`SELECT axiomos_commercial.qa_telnyx_signed_probe_finish(
    CAST(${id} AS bigint),'uncertain',CAST(NULL AS text))`;
  }catch{}
  outcome="reconcile_manually";
 }
 done(outcome);
}
