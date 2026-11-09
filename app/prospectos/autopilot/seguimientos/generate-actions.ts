"use server";
import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";

const PATH="/prospectos/autopilot/seguimientos";
export async function generateFollowupDrafts() {
  if(process.env.VERCEL_ENV!=="production" || process.env.AXIOMOS_FOLLOWUP_GENERATOR_ENABLED!=="true") {
    redirect(PATH+"?error=Generador+deshabilitado");
  }
  const auth=commercialIdentityAuth(), reader=commercialIdentityDatabase(), writer=commercialOfferWriterDatabase();
  if(!auth||!reader||!writer) redirect(PATH+"?error=Acceso+no+disponible");
  const {data,error}=await auth.getSession();
  if(error||!data?.user) redirect("/prospectos/autopilot/acceso");
  const membership=await commercialMember(reader,data.user.id);
  if(membership?.role!=="owner") redirect(PATH+"?error=Accion+exclusiva+del+propietario");
  try {
    const rows=await writer`SELECT axiomos_commercial.generate_followup_drafts_dryrun() AS created`;
    const count=Number(rows[0]?.created);
    if(!Number.isSafeInteger(count)||count<0) throw new Error("Invalid count");
    redirect(PATH+"?ok="+encodeURIComponent(count+" propuestas nuevas. Ninguna enviada."));
  } catch(e) {
    // Next.js redirect throws a control-flow exception, which must be rethrown.
    if (e && typeof e==="object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("FOLLOWUP_GENERATION_FAILED",(e as {code?:string})?.code??"unknown");
    redirect(PATH+"?error=No+se+pudo+generar");
  }
}
