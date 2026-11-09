"use server";
import {redirect} from "next/navigation";
import {commercialIdentityAuth} from "../../../lib/commercial-identity-auth";
import {commercialIdentityDatabase,commercialOfferWriterDatabase,commercialMember} from "../../../lib/commercial-identity";
import {sendQaTestOnce} from "../../../lib/autopilot-provider-bridge.mjs";

const PATH="/prospectos/autopilot/qa-e2e";
const SMS_TO="+17872320132";
function finish(code:string):never { redirect(PATH+"?resultado="+encodeURIComponent(code)); }

export async function sendQaAutopilotSmsOnce() {
 if(process.env.VERCEL_ENV!=="preview" || process.env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED!=="true" ||
    process.env.AXIOMOS_QA_E2E_SMS_SEND_ENABLED!=="true") finish("disabled");
 const reader=commercialIdentityDatabase(),writer=commercialOfferWriterDatabase(),auth=commercialIdentityAuth();
 if(!reader||!writer||!auth) finish("not_configured");
 const {data,error}=await auth.getSession();
 if(error||!data?.user?.id) finish("not_authenticated");
 const member=await commercialMember(reader,data.user.id);
 if(member?.role!=="owner") finish("not_owner");
 const key=process.env.TELNYX_API_KEY,from=process.env.TELNYX_SMS_FROM;
 if(!key||!from||!/^\+[1-9]\d{7,14}$/.test(from)) finish("provider_unavailable");

 let id="",outcome="manual_reconciliation";
 try {
   const rows=await writer`SELECT id,recipient,body,approved_at FROM
      axiomos_commercial.qa_e2e_claim_once(CAST(${data.user.id} AS UUID))`;
   const item=rows[0];
   if(!item) finish("not_claimable");
   id=String(item.id??"");
   if(!/^\d{1,18}$/.test(id)||item.recipient!==SMS_TO||
      typeof item.body!=="string"||item.body.length>160||
      !Number.isFinite(Date.parse(String(item.approved_at)))) finish("claim_invalid");
   const job={
     environment:"qa",enabled:true,ownerAuthorized:true,ownerSessionValid:true,
     tenantId:"axiomai",queueId:id,prospectId:"qa-internal",
     channel:"sms",purpose:"followup",status:"approved_for_test",
     isSynthetic:true,recipientAllowlisted:true,recipient:SMS_TO,body:item.body,
     containsSensitiveData:false,scheduledFor:String(item.approved_at),
     consent:{state:"opt_in",channel:"sms",purpose:"followup",prospectId:"qa-internal",
       recordedAt:String(item.approved_at),evidence:"Owner approved internal one-shot in Neon QA"},
     optOutAfterConsent:false,globalSuppressed:false,lastContactAt:null,messagesInLast7Days:0,
     idempotencyKey:"axiomai:sms:"+id,claimedExactlyOnce:true,attempts:1
   };
   const result=await sendQaTestOnce({job,now:new Date().toISOString(),
     config:{scope:"qa",vercelEnvironment:"preview",enabled:true,recipient:SMS_TO,
       from,telnyxApiKey:key}});
   const status=result.state==="accepted"?"accepted":
     result.state==="rejected"?"rejected":"uncertain";
   const providerId=result.state==="accepted"?result.providerMessageId:null;
   const saved=await writer`SELECT axiomos_commercial.qa_e2e_finish_once(
     CAST(${id} AS BIGINT),${status},${providerId}) AS saved`;
   outcome=saved[0]?.saved==="RECORDED_NO_RETRY"?status:"receipt_not_saved";
 } catch(e) {
   if(e&&typeof e==="object"&&"digest" in e&&String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
   console.error("QA_E2E_SMS_ERROR",{claimed:Boolean(id),kind:"execution_or_persistence"});
   if(id) try{await writer`SELECT axiomos_commercial.qa_e2e_finish_once(
     CAST(${id} AS BIGINT),'uncertain',CAST(NULL AS TEXT))`;}catch{}
   outcome="manual_reconciliation";
 }
 finish(outcome);
}
