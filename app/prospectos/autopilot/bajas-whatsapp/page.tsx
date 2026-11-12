import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { recordWhatsAppOptOut } from "./actions";

export const dynamic = "force-dynamic";

const messages = {
  recorded: "Baja de WhatsApp registrada en QA.",
  already_recorded: "Este número ya tiene una baja registrada en QA.",
  invalid_prospect: "La referencia no existe o no tiene un número de WhatsApp válido.",
  invalid: "Revisa la referencia y escribe BAJA para confirmar.",
  unavailable: "No se pudo registrar la baja. Verifica la configuración de QA.",
};

export default async function WhatsAppOptOutPage({ searchParams }: {
  searchParams: Promise<{ result?: string }>;
}) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.AXIOMOS_MANUAL_WHATSAPP_OPTOUT_QA !== "true") notFound();
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader || !commercialOfferWriterDatabase()) notFound();
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  if ((await commercialMember(reader, data.user.id))?.role !== "owner") notFound();
  const { result } = await searchParams;
  const feedback = result && Object.hasOwn(messages, result) ? messages[result as keyof typeof messages] : null;
  let fixtures: Array<{ prospect: string; campaign_eligible: boolean; followup_blocked: boolean }>;
  try {
    fixtures = await reader`SELECT * FROM axiomos_manual_optout_preview.fixture_status()` as typeof fixtures;
  } catch {
    return <main className="p-8"><p role="alert">La base de pruebas de bajas no está disponible.</p></main>;
  }

  return <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
    <section className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <Link className="text-blue-800 underline" href="/prospectos/autopilot">Volver a Autopilot</Link>
      <h1 className="mt-4 text-2xl font-bold">Registrar baja de WhatsApp · QA</h1>
      <p className="mt-2 text-slate-700">Usa la referencia de un prospecto de prueba. La baja aplica a promociones y seguimientos comerciales por WhatsApp en QA.</p>
      <table className="mt-5 w-full text-left text-sm">
        <thead><tr><th scope="col">Referencia</th><th scope="col">Campaña</th><th scope="col">Seguimiento</th></tr></thead>
        <tbody>{fixtures.map((item) => <tr key={item.prospect} className="border-t border-slate-200">
          <th scope="row" className="py-2">{item.prospect}</th>
          <td>{item.campaign_eligible ? "Elegible" : "Excluido"}</td>
          <td>{item.followup_blocked ? "Bloqueado" : "Por revisar"}</td>
        </tr>)}</tbody>
      </table>
      {feedback && <p role={result === "recorded" || result === "already_recorded" ? "status" : "alert"} className="mt-4 rounded-lg bg-slate-100 p-3">{feedback}</p>}
      <form action={recordWhatsAppOptOut} className="mt-5 grid gap-4">
        <label className="grid gap-1">
          Referencia del prospecto
          <input name="prospect" inputMode="numeric" pattern="[1-9][0-9]{0,17}" required className="rounded border border-slate-400 p-2" />
        </label>
        <label className="grid gap-1">
          Escribe BAJA para confirmar
          <input name="confirmation" pattern="BAJA" required className="rounded border border-slate-400 p-2" />
        </label>
        <button className="rounded bg-blue-800 px-4 py-2 font-semibold text-white">Registrar baja en QA</button>
      </form>
    </section>
  </main>;
}
