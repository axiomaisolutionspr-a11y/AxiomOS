import {receiveQaTelnyxEvent} from "../qa-ingress.mjs";

export const config={api:{bodyParser:false}};
let database=null;
function databaseUrl(){
 const value=process.env.AXIOMOS_QA_TELNYX_INGRESS_DATABASE_URL;
 const host=process.env.AXIOMOS_QA_TELNYX_DB_HOST;
 if(!value||!host)return null;
 try{
  const uri=new URL(value);
  if(!["postgres:","postgresql:"].includes(uri.protocol)||
     uri.username!=="axiomos_qa_telnyx_ingress"||
     uri.hostname.replace(/-pooler(?=\.)/,"")!==host.replace(/-pooler(?=\.)/,"")||
     uri.pathname!=="/neondb"||!uri.password) return null;
  return uri.href;
 }catch{return null}
}
async function getStore(){
 const url=databaseUrl();
 if(!url)return null;
 if(!database){
   const {neon}=await import("@neondatabase/serverless");
   database=neon(url,{fetchOptions:{signal:AbortSignal.timeout(6000)}});
 }
 return async({providerMessageId,eventKey,eventType,status})=>{
   const rows=await database`SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
     ${providerMessageId},${eventKey},${eventType},${status}) AS result`;
   return rows[0]?.result;
 };
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method==="GET")return res.status(200).json({
  ok:true,service:"axiomos-qa-telnyx-webhook",mode:"qa-auto-persist-preview"
 });
 if(req.method!=="POST")return res.status(405).json({ok:false});
 // The preview-only gate prevents any accidental production use of this handler.
 if(process.env.VERCEL_ENV!=="preview"||
    process.env.AXIOMOS_QA_TELNYX_AUTOSTORE!=="true")
     return res.status(503).json({ok:false,reason:"qa_disabled"});
 let parts=[],size=0;
 try{
  for await(const chunk of req){
    size+=chunk.length;
    if(size>262144)return res.status(413).json({ok:false});
    parts.push(chunk);
  }
  const store=await getStore();
  const result=await receiveQaTelnyxEvent({
    environment:"qa",method:"POST",rawBody:Buffer.concat(parts),
    headers:req.headers??{},publicKey:process.env.TELNYX_SIGNING_PUBLIC_KEY,
    storeVerifiedEvent:store
  });
  if(result.reason==="recorded"||result.reason==="duplicate")
    console.info("AXIOMOS_QA_TELNYX_AUTO_RECONCILED",result.reason);
  return res.status(result.status).json({ok:result.accepted,reason:result.reason});
 }catch{
  console.error("AXIOMOS_QA_TELNYX_AUTOSTORE_UNAVAILABLE");
  return res.status(503).json({ok:false,reason:"qa_store_unavailable"});
 }
}
