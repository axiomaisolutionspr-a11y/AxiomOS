"use server";
import {redirect} from "next/navigation";
import {commercialIdentityAuth} from "../../../lib/commercial-identity-auth";
import {commercialIdentityDatabase,commercialOfferWriterDatabase,commercialMember} from "../../../lib/commercial-identity";
const BASE="/prospectos/autopilot/qa-e2e";
function finish(code:string):never{redirect(BASE+"?resultado="+encodeURIComponent(code));}
export async function checkQaSmsDeliveryStatus() {
 if(process.env.VERCEL_ENV!=="preview"||
    process.env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED!=="true") finish("disabled");
 const reader=commercialIdentityDatabase(),writer=commercialOfferWriterDatabase(),auth=commercialIdentityAuth();
 if(!reader||!writer||!auth) finish("not_configured");
 const {data,error}=await auth.getSession();
 if(error||!data?.user?.id) finish("not_authenticated");
 const member=await commercialMember(reader,data.user.id);
 if(member?.role!=="owner") finish("not_owner");
 const key=process.env.TELNYX_API_KEY;
 if(!key) finish("provider_unavailable");
 let outcome="provider_status_unknown";
 try {
   const rows=await writer`SELECT id,provider_message_id,state FROM
     axiomos_commercial.qa_e2e_get_receipt(CAST(${data.user.id} AS UUID))`;
   const receipt=rows[0];
   const messageId=String(receipt?.provider_message_id??"");
   if(!/^[a-zA-Z0-9._-]{8,150}$/.test(messageId)) finish("no_provider_receipt");
   const res=await fetch("https://api.telnyx.com/v2/messages/"+encodeURIComponent(messageId),{
     method:"GET",cache:"no-store",headers:{Authorization:"Bearer "+key,Accept:"application/json"},
     signal:AbortSignal.timeout(12000)
   });
   if(!res.ok) finish("lookup_failed");
   const payload=await res.json() as {
     data?:{id?:unknown;to?:Array<{phone_number?:unknown;status?:unknown}>}
   };
   if(payload.data?.id!==messageId) finish("lookup_mismatch");
   const destination=payload.data?.to?.find(t=>t.phone_number==="+17872320132");
   if(!destination || typeof destination.status!=="string") finish("lookup_mismatch");
   const state=destination.status;
   if(!["queued","sending","sent","delivered","delivery_failed","sending_failed","delivery_unconfirmed","expired"].includes(state)) finish("provider_status_unknown");
   const recorded=await writer`SELECT axiomos_commercial.qa_e2e_record_telnyx_lookup(
     CAST(${data.user.id} AS UUID),${messageId},${state}) AS result`;
   const status=String(recorded[0]?.result??"");
   outcome=status==="TELNYX_API_DELIVERY_CONFIRMED"?"delivered_api":
     status==="UNKNOWN_PROVIDER_MESSAGE"?"lookup_mismatch":
     status==="INVALID_PROVIDER_STATUS"?"provider_status_unknown":
     state==="delivered"?"delivered_api":
     ["delivery_failed","sending_failed","expired"].includes(state)?"failed_api":
     state==="delivery_unconfirmed"?"unconfirmed_api":"pending_api";
 } catch(e) {
   if(e && typeof e==="object" && "digest" in e &&
     String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
   console.error("QA_E2E_STATUS_QUERY_FAILURE",{category:"telnyx_read_or_db"});
   outcome="lookup_failed";
 }
 finish(outcome);
}
