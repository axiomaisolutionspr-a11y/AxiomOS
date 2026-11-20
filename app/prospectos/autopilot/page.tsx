import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOfferState, offerMoney, OFFER_CHANNELS, OFFER_PRODUCTS, puertoRicoLocalDateTime } from "../../lib/axira-offers-policy.js";
import { listOffers } from "../../lib/axira-offers-store.js";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../lib/commercial-identity";
import { commercialIdentityAuth } from "../../lib/commercial-identity-auth";
import { whatsappManualOptOutMode, whatsappManualOptOutSharesCampaignDatabase } from "../../lib/whatsapp-manual-opt-out-mode.mjs";
import { changeQaOfferStatus, createQaOffer } from "./offer-actions";
import SignOut from "./sign-out";
import HoloLogo from "./holo-logo";
import FuturoFx from "./futuro-fx";
import ExperienceControls from "./experience-controls";
import { systemMessage } from "./i18n";
import { uiPrefs } from "./prefs";

export const dynamic = "force-dynamic";
type Offer = {
  id: string; checked_at_ms: string; name: string; product_key: keyof typeof OFFER_PRODUCTS;
  promo_cents: number; normal_cents: number; starts_at: string; ends_at: string;
  activation_cents: number; status: string; revision: number; channels: string[];
  tax_included: boolean; terms_es: string; terms_en: string; external_es: string; external_en: string;
  max_clients: number | null;
};

export default async function AutopilotQaPage({ searchParams }: {
  searchParams: Promise<{ok?: string; error?: string}>;
}) {
  const { lang, mode, t, locale } = await uiPrefs();
  const dateFormat = new Intl.DateTimeFormat(locale, { timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short" });
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1>{t.accessUnavailable}</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>{t.permissionFailed}</h1></main>; }
  if (!membership) return <main className="p-8"><h1>{t.noPermission}</h1><SignOut lang={lang} /></main>;

  let offers: Offer[] = [];
  let catalogError = false;
  try { offers = await listOffers(sql) as Offer[]; }
  catch { catalogError = true; }
  const now = offers.length ? Number(offers[0].checked_at_ms) : 0;
  const catalog = offers.map((offer) => ({ offer, state: getOfferState(offer, now) }));
  const active = catalog.filter(({ state }) => state === "active");
  const drafts = catalog.filter(({ state }) => state === "draft");
  const expiring = active.filter(({ offer }) => Date.parse(offer.ends_at) - now <= 72 * 60 * 60 * 1000);
  const role = { owner: t.roleOwner, operator: t.roleOperator, viewer: t.roleViewer }[membership.role];
  const canEdit = membership.role === "owner" && !catalogError && Boolean(commercialOfferWriterDatabase());
  const isQa = process.env.VERCEL_ENV === "preview";
  // Read-only summary through a restricted aggregate view. The reader role must never get direct access to public.prospects.
  let legacyProspectCount: number | null = null;
  if (process.env.AXIOMOS_AUTOPILOT_PROSPECTS_READ_ENABLED === "true" && process.env.VERCEL_ENV === "production") {
    try {
      const rows = await sql`SELECT total FROM axiomos_commercial.legacy_prospect_count`;
      const value = Number(rows[0]?.total);
      if (Number.isSafeInteger(value) && value >= 0) legacyProspectCount = value;
    } catch (cause) {
      console.error("AUTOPILOT_PROSPECTS_READ_UNAVAILABLE", (cause as {code?: string})?.code ?? "unknown");
    }
  }
  let prospectSummary: Record<string, number> | null = null;
  if (process.env.VERCEL_ENV === "production" && process.env.AXIOMOS_AUTOPILOT_PROSPECT_SUMMARY_ENABLED === "true") {
    try {
      const rows = await sql`SELECT total, new_count, interested_count, followup_count, lost_count, overdue_count, due_next_7_days, with_notes, unassigned FROM axiomos_commercial.legacy_prospect_summary`;
      const value = rows[0];
      if (value && Object.values(value).every(v => Number.isSafeInteger(Number(v)) && Number(v) >= 0)) {
        prospectSummary = Object.fromEntries(Object.entries(value).map(([k,v]) => [k, Number(v)]));
      }
    } catch (cause) {
      console.error("AUTOPILOT_PROSPECT_SUMMARY_UNAVAILABLE", (cause as {code?: string})?.code ?? "unknown");
    }
  }
  type FollowupReview = {prospect_id: string; stage: string; due_at: string; priority: string};
  let followupReview: FollowupReview[] | null = null;
  if (process.env.VERCEL_ENV === "production" && process.env.AXIOMOS_AUTOPILOT_FOLLOWUP_REVIEW_ENABLED === "true") {
    try {
      const rows = await sql`SELECT prospect_id, stage, due_at, priority FROM axiomos_commercial.legacy_followup_review LIMIT 50`;
      if (rows.length <= 50 && rows.every(row => /^\d{1,18}$/.test(String(row.prospect_id)) && ["Interesado", "Seguimiento"].includes(String(row.stage)) && ["overdue", "upcoming"].includes(String(row.priority)) && !Number.isNaN(Date.parse(String(row.due_at))))) {
        followupReview = rows.map(row => ({ prospect_id: String(row.prospect_id), stage: String(row.stage), due_at: String(row.due_at), priority: String(row.priority) }));
      }
    } catch (cause) {
      console.error("AUTOPILOT_FOLLOWUP_REVIEW_UNAVAILABLE", (cause as {code?: string})?.code ?? "unknown");
    }
  }
  const feedback = await searchParams;
  const channelName = (c: string) => ({ whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" } as Record<string, string>)[c] ?? c;

  return <main lang={lang} data-fx-mode={mode} className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <HoloLogo label={t.logoLabel} />
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot {isQa ? "· QA" : ""}</p>
          <h1 className="mt-2 text-3xl font-bold">{t.hello}, {data.user.name || data.user.email}</h1>
          <p className="mt-2 text-slate-300">AxiomAI Solutions · {role} · {canEdit ? t.manageOffers : t.readOnly}</p>
          <Link href="/prospectos/autopilot/catalogo" className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{t.toCatalog}</Link>
        </div>
        <div className="grid justify-items-start gap-3 sm:justify-items-end">
          <ExperienceControls lang={lang} mode={mode} />
          <SignOut lang={lang} />
        </div>
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7">
      {membership.role === "owner" && (isQa ? whatsappManualOptOutMode() === "qa" : whatsappManualOptOutMode() === "production" && whatsappManualOptOutSharesCampaignDatabase()) && commercialOfferWriterDatabase() &&
        <Link className="font-semibold text-blue-800 underline" href="/prospectos/autopilot/bajas-whatsapp">{t.optOutLink}{isQa ? " · QA" : ""}</Link>}
      {feedback.ok && <p role="status" className="rounded-xl bg-green-100 p-4 text-green-950">{systemMessage(lang, feedback.ok)}</p>}
      {feedback.error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-red-950">{systemMessage(lang, feedback.error)}</p>}
      <section aria-label={t.summaryLabel} className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">{t.verifiable}</p>
        <h2 className="mt-2 text-2xl font-bold">{t.commercialStatus}</h2>
        {catalogError ? <p role="alert" className="mt-3 text-red-800">{t.catalogReadError}</p>
          : <p className="mt-3 text-slate-700">
            {active.length === 0 ? t.noActive : t.activeCount(active.length)}
            {drafts.length > 0 && t.draftsWaiting(drafts.length)}
            {expiring.length > 0 && t.expiringSoon(expiring.length)}
          </p>}
        <p className="mt-3 text-sm text-slate-600">{t.source} {isQa ? t.sourceQa : t.sourceProd} {t.computedOnQuery}</p>
      </section>
      <section aria-label={t.indicators} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["active", t.activePromos, active.length], ["review", t.toReview, drafts.length],
          ["expiring", t.expiring72, expiring.length], ["prospects", t.prospects, legacyProspectCount ?? t.noConnection],
        ] as const).map(([id, label, value]) => <div key={id} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-bold">{catalogError && id !== "prospects" ? "—" : value}</p>
        </div>)}
      </section>
      {prospectSummary && <section aria-label={t.prospectSummary} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{t.prospectSummary}</h2>
        <p className="mt-2 text-sm text-slate-600">{t.prospectSummaryNote}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([[t.total, "total"], [t.newCount, "new_count"], [t.interested, "interested_count"], [t.inFollowup, "followup_count"], [t.lost, "lost_count"], [t.overdue, "overdue_count"], [t.next7, "due_next_7_days"], [t.unassigned, "unassigned"]] as const).map(([label, key]) => <div key={key} className="rounded-lg border border-slate-200 p-3"><div className="text-sm text-slate-600">{label}</div><div className="text-2xl font-bold">{prospectSummary![key]}</div></div>)}
        </div>
      </section>}
      {followupReview && <section aria-label={t.followupTitle} className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{t.followupTitle}</h2>
        <p className="mt-2 text-sm text-slate-700">{t.followupNote}</p>
        {followupReview.length === 0 ? <p className="mt-3">{t.noFollowups}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">{t.reference}</th><th>{t.stage}</th><th>{t.datePr}</th><th>{t.priority}</th></tr></thead><tbody>
          {followupReview.map(item => <tr key={item.prospect_id} className="border-b"><td className="py-2">#{item.prospect_id}</td><td>{item.stage}</td><td>{dateFormat.format(new Date(item.due_at))}</td><td>{item.priority === "overdue" ? t.overdueReview : t.upcoming}</td></tr>)}
        </tbody></table></div>}
      </section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{t.offersCatalog}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.offersCatalogNote}</p>
        {!catalogError && catalog.length === 0 && <p className="mt-4">{t.noOffers}</p>}
        {!catalogError && <ul className="mt-4 grid gap-3">
          {catalog.map(({ offer, state }) => <li key={offer.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{offer.name}</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{t.offerStates[state] || t.offerStates.unavailable}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{OFFER_PRODUCTS[offer.product_key]} · {t.revision} {offer.revision}</p>
            <p className="mt-1 text-sm">{offerMoney(offer.promo_cents)}{t.perMonth} · {t.regular} {offerMoney(offer.normal_cents)} · {t.activation} {offerMoney(offer.activation_cents)}</p>
            <p className="mt-1 text-sm text-slate-600">{t.fromTo(dateFormat.format(new Date(offer.starts_at)), dateFormat.format(new Date(offer.ends_at)))} · {t.channels}: {offer.channels.map(channelName).join(", ")}</p>
            {lang === "en" && (offer.terms_en || offer.external_en)
              ? <p className="mt-1 text-sm">{offer.tax_included ? t.taxIncluded : t.taxExcluded} {offer.terms_en} {t.externalCharges} {offer.external_en}</p>
              : <p className="mt-1 text-sm">{offer.tax_included ? t.taxIncluded : t.taxExcluded} {offer.terms_es} {t.externalCharges} {offer.external_es}</p>}
            {offer.max_clients && <p className="mt-1 text-sm">{t.maxClientsNote(offer.max_clients)}</p>}
            {canEdit && state !== "expired" && Date.parse(offer.ends_at) > now && <form action={changeQaOfferStatus} className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
              <input type="hidden" name="id" value={offer.id} />
              <input type="hidden" name="revision" value={offer.revision} />
              <input type="hidden" name="target" value={offer.status === "approved" ? "paused" : "approved"} />
              <label className="grid gap-1 text-sm">{t.typeToConfirm(offer.status === "approved" ? "PAUSAR" : "APROBAR")}
                <input name="confirmation" required autoComplete="off" className="rounded border p-2" />
              </label>
              <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{offer.status === "approved" ? t.pause : t.approve}</button>
            </form>}
          </li>)}
        </ul>}
      </section>
      {canEdit && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">{t.createOfferDraft}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.offerDraftNote} {isQa ? t.offerDraftQa : t.offerDraftProd}</p>
        <form action={createQaOffer} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="requestId" value={randomUUID()} />
          <label className="grid gap-1 text-sm">{t.name}<input name="name" minLength={3} maxLength={80} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.service}<select name="product" required defaultValue="" className="rounded border p-2"><option value="" disabled>{t.select}</option>{Object.entries(OFFER_PRODUCTS).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
          {([["normal",t.regularMonthly],["promo",t.promoMonthly],["activation",t.activationCost]] as const).map(([name,label])=><label key={name} className="grid gap-1 text-sm">{label} (USD)<input name={name} type="number" min="0" max="999999.99" step="0.01" required className="rounded border p-2" /></label>)}
          <label className="grid gap-1 text-sm">{t.startPr}<input name="start" type="datetime-local" required defaultValue={puertoRicoLocalDateTime()} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.endPr}<input name="end" type="datetime-local" required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.taxes}<select name="tax" defaultValue="" required className="rounded border p-2"><option value="" disabled>{t.select}</option><option value="included">{t.included}</option><option value="excluded">{t.excluded}</option></select></label>
          <label className="grid gap-1 text-sm">{t.termsEs}<input name="termsEs" maxLength={120} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.termsEn}<input name="termsEn" maxLength={120} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.externalEs}<input name="externalEs" maxLength={80} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.externalEn}<input name="externalEn" maxLength={80} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">{t.maxClients}<input name="maxClients" type="number" min="1" max="10000" className="rounded border p-2" /></label>
          <fieldset className="flex flex-wrap gap-3 text-sm"><legend>{t.allowedChannels}</legend>{OFFER_CHANNELS.map(channel=><label key={channel} className="flex items-center gap-1"><input type="checkbox" name="channels" value={channel} />{channelName(channel)}</label>)}</fieldset>
          <button className="w-fit rounded bg-blue-700 px-5 py-3 font-semibold text-white">{t.saveDraft}</button>
        </form>
      </section>}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-bold">{t.nextConnection}</h2>
        <p className="mt-1 text-sm">{t.nextConnectionNote}</p>
      </section>
    </div>
  </main>;
}
