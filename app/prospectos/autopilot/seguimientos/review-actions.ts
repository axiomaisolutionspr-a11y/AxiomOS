"use server";
import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
const PATH="/prospectos/autopilot/seguimientos";
export async function recordFollowupReview(form: FormData) {
  if(process.env.VERCEL_ENV!=="production" || process.env.AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED!=="true") {
    redirect(PATH+"?error=Revisión+no+habilitada");
  }
  const reader=commercialIdentityDatabase(), writer=commercialOfferWriterDatabase(), auth=commercialIdentityAuth();
  if(!reader||!writer||!auth) redirect(PATH+"?error=Acceso+no+disponible");
  const {data,error}=await auth.getSession();
  if(error||!data?.user) redirect("/prospectos/autopilot/acceso");
  const member=await commercialMember(reader,data.user.id);
  if(member?.role!=="owner") redirect(PATH+"?error=Solo+el+propietario+puede+registrar+decisiones");
  const id=String(form.get("itemId")??"").trim();
  const decision=String(form.get("decision")??"").trim();
  const confirmation=String(form.get("confirmation")??"").trim();
  if(!/^[1-9]\d{0,17}$/.test(id)||!["reviewed_only","blocked"].includes(decision)||confirmation!=="REGISTRAR") {
    redirect(PATH+"?error=Datos+de+revisión+incorrectos");
  }
  try {
    await writer`INSERT INTO axiomos_commercial.followup_review_decisions
      (tenant_id,queue_id,decision,actor_id)
      SELECT 'axiomai',item_id::bigint,${decision},${data.user.id}::uuid
      FROM axiomos_commercial.followup_review_dashboard
      WHERE item_id=${id} AND tenant_id='axiomai' AND status='needs_review'
      ON CONFLICT (tenant_id,queue_id) DO NOTHING`;
  } catch(e) {
    console.error("FOLLOWUP_REVIEW_DECISION_FAILED",(e as {code?:string})?.code??"unknown");
    redirect(PATH+"?error=No+se+pudo+registrar");
  }
  redirect(PATH+"?ok=Decisión+registrada+sin+enviar+mensajes");
}
