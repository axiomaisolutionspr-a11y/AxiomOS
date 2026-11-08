"use server";

import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../lib/commercial-identity";

const PATH = "/prospectos/autopilot";
function fail(message: string): never {
  redirect(PATH + "?" + new URLSearchParams({error:message}));
}

export async function assignFollowup(formData: FormData) {
  if (process.env.VERCEL_ENV !== "production" || process.env.AXIOMOS_AUTOPILOT_ASSIGNMENTS_ENABLED !== "true") fail("Asignaciones no disponibles.");
  const auth = commercialIdentityAuth(), reader = commercialIdentityDatabase();
  if (!auth || !reader) fail("Acceso no configurado.");
  const {data,error} = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let member;
  try { member = await commercialMember(reader,data.user.id); } catch { fail("No se pudo verificar el permiso."); }
  if (member?.role !== "owner") fail("Solo el propietario puede asignar tareas.");
  const id=String(formData.get("prospectId")||"");
  const assignee=String(formData.get("assignee")||"");
  const revision=Number(formData.get("revision"));
  if (!/^[1-9]\d{0,17}$/.test(id) || !/^[a-f\d-]{36}$/i.test(assignee) || !Number.isSafeInteger(revision) || revision<0 || revision>2147483646) fail("Datos de asignación no válidos.");
  const writer=commercialOfferWriterDatabase();
  if (!writer) fail("Escritura no disponible.");
  try {
    const changes=await writer`SELECT prospect_id,revision FROM axiomos_commercial.assign_followup(${id}::bigint,${assignee}::uuid,${data.user.id}::uuid,${revision}::integer)`;
    if (!changes.length) fail("La asignación no se aplicó. Revisa la versión y los permisos.");
  } catch (cause) {
    console.error("AUTOPILOT_ASSIGNMENT_FAILED",(cause as {code?:string})?.code ?? "unknown");
    fail("No se pudo registrar la asignación.");
  }
  redirect(PATH+"?"+new URLSearchParams({ok:"Asignación registrada y auditada."}));
}
