import {NextRequest} from "next/server";
import {commercialOfferWriterDatabase} from "../../../../lib/commercial-identity";
import {ingestQaVerifiedWebhook} from "../../../../lib/autopilot-provider-bridge.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 if(process.env.VERCEL_ENV!=="preview" ||
   process.env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED!=="true")
   return Response.json({ok:false},{status:404});
 const publicKey=process.env.AXIOMOS_QA_TELNYX_PUBLIC_KEY;
 const writer=commercialOfferWriterDatabase();
 if(!publicKey||!writer)
   return Response.json({ok:false,error:"webhook_not_configured"},{status:503});
 let raw="";
 try {raw=await request.text();}catch{return Response.json({ok:false},{status:400});}
 try {
   const r=await ingestQaVerifiedWebhook({
     provider:"telnyx",rawBody:raw,
     headers:{
       "telnyx-signature-ed25519":request.headers.get("telnyx-signature-ed25519")??"",
       "telnyx-timestamp":request.headers.get("telnyx-timestamp")??""
     },
     config:{scope:"qa",vercelEnvironment:"preview",enabled:true,telnyxPublicKey:publicKey},
     onVerifiedEvent:async(event:{
       provider:string;providerMessageId:string;eventKey:string;status:string
     })=>{
       const rows=await writer`SELECT axiomos_commercial.qa_e2e_verified_event(
         ${event.providerMessageId},${event.eventKey},${event.status}) AS outcome`;
       const status=String(rows[0]?.outcome??"");
       if(status==="INVALID_EVENT")throw Error("Unexpected QA status");
     }
   });
   return Response.json({ok:r.ok,processed:r.processed??0},{status:r.status});
 } catch(e) {
   console.error("QA_E2E_WEBHOOK_PROCESSING_ERROR",{kind:"verification_or_persistence"});
   return Response.json({ok:false},{status:500});
 }
}
