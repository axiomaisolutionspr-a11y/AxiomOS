import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { recordWhatsAppOptOut } from "./actions";
import { whatsappManualOptOutMode, whatsappManualOptOutSharesCampaignDatabase } from "../../../lib/whatsapp-manual-opt-out-mode.mjs";

export const dynamic = "force-dynamic";

export default async function WhatsAppOptOutPage({ searchParams }: {
  searchParams: Promise<{ result?: string }>;
}) {
  const mode = whatsappManualOptOutMode();
  if (!mode || (mode === "production" && !whatsappManualOptOutSharesCampaignDatabase())) notFound();
  const qa = mode === "qa";
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader || !commercialOfferWriterDatabase()) notFound();
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  if ((await commercialMember(reader, data.user.id))?.role !== "owner") notFound();
  const messages = {
    recorded: qa ? "Baja de WhatsApp registrada en QA." : "Baja de WhatsApp registrada.",
    already_recorded: "Este número ya tiene una baja registrada.",
    invalid_prospect: qa ? "La referencia no existe o no tiene un número de WhatsApp válido."
      : "No se encontró un número válido para esa referencia y esos cuatro dígitos.",
    invalid: "Revisa los datos y escribe BAJA para confirmar.",
    unavailable: "No se pudo registrar la baja.",
  };
  const { result } = await searchParams;
  const feedback = result && Object.hasOwn(messages, result) ? messages[result as keyof typeof messages] : null;
  let fixtures: Array<{ prospect: string; campaign_eligible: boolean; followup_blocked: boolean }> = [];
  try {
    if (qa) fixtures = await reader`SELECT * FROM axiomos_manual_optout_preview.fixture_status()` as typeof fixtures;
  } catch {
    return <main className="p-8"><p role="alert">La base de pruebas de bajas no está disponible.</p></main>;
  }

  return <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
    <section className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <Link className="text-blue-800 underline" href="/prospectos/autopilot">Volver a Autopilot</Link>
      <h1 className="mt-4 text-2xl font-bold">Registrar baja de WhatsApp{qa ? " · QA" : ""}</h1>
      <p className="mt-2 text-slate-700">{qa ? "Usa la referencia de un prospecto de prueba."
        : "Usa la referencia del prospecto y confirma los últimos cuatro dígitos de su número."} La baja aplica a promociones y seguimientos comerciales por WhatsApp.</p>
      {qa && <table className="mt-5 w-full text-left text-sm">
        <thead><tr><th scope="col">Referencia</th><th scope="col">Campaña</th><th scope="col">Seguimiento</th></tr></thead>
        <tbody>{fixtures.map((item) => <tr key={item.prospect} className="border-t border-slate-200">
          <th scope="row" className="py-2">{item.prospect}</th>
          <td>{item.campaign_eligible ? "Elegible" : "Excluido"}</td>
          <td>{item.followup_blocked ? "Bloqueado" : "Por revisar"}</td>
        </tr>)}</tbody>
      </table>}
      {feedback && <p role={result === "recorded" || result === "already_recorded" ? "status" : "alert"} className="mt-4 rounded-lg bg-slate-100 p-3">{feedback}</p>}
      <form action={recordWhatsAppOptOut} className="mt-5 grid gap-4">
        <label className="grid gap-1">
          Referencia del prospecto
          <input name="prospect" inputMode="numeric" pattern="[1-9][0-9]{0,17}" required className="rounded border border-slate-400 p-2" />
        </label>
        {!qa && <label className="grid gap-1">
          Últimos cuatro dígitos del número de WhatsApp
          <input name="phoneSuffix" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required className="rounded border border-slate-400 p-2" />
        </label>}
        <label className="grid gap-1">
          Escribe BAJA para confirmar
          <input name="confirmation" pattern="BAJA" required className="rounded border border-slate-400 p-2" />
        </label>
        <button className="rounded bg-blue-800 px-4 py-2 font-semibold text-white">{qa ? "Registrar baja en QA" : "Registrar baja"}</button>
      </form>
    </section>
  </main>;
}
