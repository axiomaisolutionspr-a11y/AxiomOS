/**
 * Protected-preview only. No customer data, no SQL writes or provider calls.
 * Confirms the new least-privilege QA ingress role actually connects to Neon.
 */
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({ok:false});
 if(process.env.VERCEL_ENV!=="preview"||
    process.env.AXIOMOS_QA_TELNYX_AUTOSTORE!=="true")
   return res.status(404).json({ok:false});
 try{
   const raw=process.env.AXIOMOS_QA_TELNYX_INGRESS_DATABASE_URL;
   const host=process.env.AXIOMOS_QA_TELNYX_DB_HOST;
   if(!raw||!host)return res.status(503).json({ok:false,reason:"not_configured"});
   const uri=new URL(raw);
   if(!["postgres:","postgresql:"].includes(uri.protocol)||
      uri.username!=="axiomos_qa_telnyx_ingress"||
      uri.hostname.replace(/-pooler(?=\.)/,"")!==host.replace(/-pooler(?=\.)/,"")||
      uri.pathname!=="/neondb"||!uri.password)
     return res.status(503).json({ok:false,reason:"qa_guard"});
   const {neon}=await import("@neondatabase/serverless");
   const sql=neon(raw,{fetchOptions:{signal:AbortSignal.timeout(6000)}});
   const result=await sql`SELECT current_user AS role,
     has_function_privilege(current_user,
       'axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)',
       'EXECUTE') AS can_reconcile,
     has_table_privilege(current_user,
       'axiomos_commercial.qa_telnyx_signed_probe','SELECT') AS can_read_probe`;
   const row=result?.[0];
   const ok=row?.role==="axiomos_qa_telnyx_ingress"&&row?.can_reconcile===true&&row?.can_read_probe===false;
   return res.status(ok?200:503).json({ok,mode:"qa-restricted-ingress"});
 }catch{
   return res.status(503).json({ok:false,reason:"qa_connection_unavailable"});
 }
}
