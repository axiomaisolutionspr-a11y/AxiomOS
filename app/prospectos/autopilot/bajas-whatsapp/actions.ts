"use server";

import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";

const path = "/prospectos/autopilot/bajas-whatsapp";

export async function recordWhatsAppOptOut(form: FormData) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.AXIOMOS_MANUAL_WHATSAPP_OPTOUT_QA !== "true") notFound();
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  const writer = commercialOfferWriterDatabase();
  if (!auth || !reader || !writer) notFound();
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  if ((await commercialMember(reader, data.user.id))?.role !== "owner") notFound();
  const prospect = form.get("prospect");
  if (typeof prospect !== "string" || !/^[1-9][0-9]{0,17}$/.test(prospect) || form.get("confirmation") !== "BAJA") {
    redirect(path + "?result=invalid");
  }
  let result: unknown;
  try {
    const [row] = await writer`SELECT axiomos_manual_optout_preview.record_whatsapp_manual_opt_out(
      ${prospect}::bigint, ${data.user.id}::uuid) AS result`;
    result = row?.result;
  } catch {
    redirect(path + "?result=unavailable");
  }
  if (result === "recorded" || result === "already_recorded" || result === "invalid_prospect") {
    redirect(path + "?result=" + result);
  }
  redirect(path + "?result=unavailable");
}
