import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { recordWhatsAppOptOut } from "./actions";
import FuturoFx from "../futuro-fx";
import ExperienceControls from "../experience-controls";
import { uiPrefs } from "../prefs";
import { whatsappManualOptOutMode, whatsappManualOptOutSharesCampaignDatabase } from "../../../lib/whatsapp-manual-opt-out-mode.mjs";

export const dynamic = "force-dynamic";

export default async function WhatsAppOptOutPage({ searchParams }: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { lang, mode: fxMode, t } = await uiPrefs();
  const mode = whatsappManualOptOutMode();
  if (!mode || (mode === "production" && !whatsappManualOptOutSharesCampaignDatabase())) notFound();
  const qa = mode === "qa";
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader || !commercialOfferWriterDatabase()) notFound();
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  if ((await commercialMember(reader, data.user.id))?.role !== "owner") notFound();
  const m = t.optOutMessages;
  const messages = {
    recorded: qa ? m.recordedQa : m.recorded,
    already_recorded: m.already_recorded,
    invalid_prospect: qa ? m.invalid_prospectQa : m.invalid_prospect,
    invalid: m.invalid,
    unavailable: m.unavailable,
  };
  const { result } = await searchParams;
  const feedback = result && Object.hasOwn(messages, result) ? messages[result as keyof typeof messages] : null;
  let fixtures: Array<{ prospect: string; campaign_eligible: boolean; followup_blocked: boolean }> = [];
  try {
    if (qa) fixtures = await reader`SELECT * FROM axiomos_manual_optout_preview.fixture_status()` as typeof fixtures;
  } catch {
    return <main className="p-8"><p role="alert">{t.optOutUnavailable}</p></main>;
  }

  return <main lang={lang} data-fx-mode={fxMode} className="fx min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
    <FuturoFx />
    <div className="mx-auto mb-4 flex max-w-lg justify-end"><ExperienceControls lang={lang} mode={fxMode} /></div>
    <section className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <Link className="text-blue-800 underline" href="/prospectos/autopilot">{t.backToAutopilot}</Link>
      <h1 className="mt-4 text-2xl font-bold">{t.optOutTitle}{qa ? " · QA" : ""}</h1>
      <p className="mt-2 text-slate-700">{qa ? t.optOutQaIntro : t.optOutProdIntro} {t.optOutScope}</p>
      {qa && <table className="mt-5 w-full text-left text-sm">
        <thead><tr><th scope="col">{t.reference}</th><th scope="col">{t.campaign}</th><th scope="col">{t.followup}</th></tr></thead>
        <tbody>{fixtures.map((item) => <tr key={item.prospect} className="border-t border-slate-200">
          <th scope="row" className="py-2">{item.prospect}</th>
          <td>{item.campaign_eligible ? t.eligible : t.excludedState}</td>
          <td>{item.followup_blocked ? t.blocked : t.toReviewState}</td>
        </tr>)}</tbody>
      </table>}
      {feedback && <p role={result === "recorded" || result === "already_recorded" ? "status" : "alert"} className="mt-4 rounded-lg bg-slate-100 p-3">{feedback}</p>}
      <form action={recordWhatsAppOptOut} className="mt-5 grid gap-4">
        <label className="grid gap-1">
          {t.prospectRef}
          <input name="prospect" inputMode="numeric" pattern="[1-9][0-9]{0,17}" required className="rounded border border-slate-400 p-2" />
        </label>
        {!qa && <label className="grid gap-1">
          {t.last4}
          <input name="phoneSuffix" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required className="rounded border border-slate-400 p-2" />
        </label>}
        <label className="grid gap-1">
          {t.typeBaja}
          <input name="confirmation" pattern="BAJA" required className="rounded border border-slate-400 p-2" />
        </label>
        <button className="rounded bg-blue-800 px-4 py-2 font-semibold text-white">{qa ? t.recordOptOutQa : t.recordOptOut}</button>
      </form>
    </section>
  </main>;
}
