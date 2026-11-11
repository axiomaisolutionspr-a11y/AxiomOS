"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../../lib/commercial-identity";
import { sendWhatsAppPilot, whatsappPilotSettings } from "./pilot-provider";
import { checkWhatsAppFollowupProvider } from "./provider";

const path = "/prospectos/autopilot/seguimientos/simulacion-whatsapp";

export async function runWhatsAppPilot(form: FormData) {
  const settings = whatsappPilotSettings();
  if (!settings || form.get("confirmacion") !== "ENVIAR PRUEBA") redirect(path + "?piloto=disabled");

  const reader = commercialIdentityDatabase();
  const writer = commercialOfferWriterDatabase();
  const auth = commercialIdentityAuth();
  if (!reader || !writer || !auth) redirect(path + "?piloto=disabled");
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  const actor = data.user.id;
  const member = await commercialMember(reader, actor);
  if (member?.role !== "owner") redirect(path + "?piloto=disabled");

  const provider = await checkWhatsAppFollowupProvider();
  if (provider.phone !== "verified" || provider.template !== "verified") redirect(path + "?piloto=unavailable");
  const recipientHash = createHash("sha256").update(settings.recipient).digest("hex");
  const [reservation] = await writer`SELECT axiomos_commercial.claim_whatsapp_followup_pilot(${actor}::uuid,${recipientHash}) AS claimed`
    .catch(() => []);
  if (reservation?.claimed !== true) redirect(path + "?piloto=not_claimed");

  const { outcome, providerId } = await sendWhatsAppPilot(settings);
  const [saved] = await writer`SELECT axiomos_commercial.finish_whatsapp_followup_pilot(${actor}::uuid,${outcome},${providerId}) AS saved`
    .catch(() => []);
  redirect(path + "?piloto=" + (saved?.saved === true ? outcome : "unknown"));
}
