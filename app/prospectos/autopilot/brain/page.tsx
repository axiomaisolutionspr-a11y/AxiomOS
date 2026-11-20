import Link from "next/link";
import { redirect } from "next/navigation";
import { money } from "../../../lib/axira-catalog-policy.js";
import { AXIOMAI_TENANT, loadPublishedCatalog, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { BRAIN_PLAN_KEYS, brainAllowance, brainPeriod, brainSuggestions, readBrainState } from "../../../lib/axiomos-brain.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { whatsappManualOptOutMode, whatsappManualOptOutSharesCampaignDatabase } from "../../../lib/whatsapp-manual-opt-out-mode.mjs";
import SignOut from "../sign-out";
import HoloLogo from "../holo-logo";
import FuturoFx from "../futuro-fx";
import AppNav from "../app-nav";
import ExperienceControls from "../experience-controls";
import { systemMessage } from "../i18n";
import { uiPrefs } from "../prefs";
import BrainChat from "./brain-chat";
import { cancelBrainPack, confirmBrainPackTest, requestBrainPack, setBrainTestPlan } from "./actions";

export const dynamic = "force-dynamic";
type Purchase = { id: string; item_key: string; questions: number; price_cents: number; status: string; requested_at: string };

export default async function BrainPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { lang, mode, theme, t, locale } = await uiPrefs();
  const b = t.brain;
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1 className="text-xl font-bold">{t.accessUnavailable}</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>{t.permissionFailed}</h1></main>; }
  if (!membership) return <main className="p-8"><h1>{t.noPermission}</h1><SignOut lang={lang} /></main>;

  const isQa = process.env.VERCEL_ENV === "preview";
  const owner = membership.role === "owner";
  const writerOn = Boolean(commercialOfferWriterDatabase());
  const reader = neonCatalogDb(sql)!;
  let ready = writerOn;
  let state: { account: { plan_key: string; addon_packs: number }; used: number; purchases: Purchase[] } = { account: { plan_key: "axiomos-gratis", addon_packs: 0 }, used: 0, purchases: [] };
  const catalog = await loadPublishedCatalog(reader, AXIOMAI_TENANT, "web");
  try { state = await readBrainState(reader, AXIOMAI_TENANT, brainPeriod()) as typeof state; }
  catch (cause) { ready = false; console.error("BRAIN_STATE_READ_FAILED", (cause as { code?: string })?.code ?? "unknown"); }
  const allowance = brainAllowance(catalog, state.account);
  if (!allowance.available) ready = false;
  const pendingPurchase = state.purchases.find((p) => p.status === "pending");
  const params = await searchParams;
  const fmtDate = new Intl.DateTimeFormat(locale, { timeZone: "America/Puerto_Rico", dateStyle: "medium" });
  const showOptOut = owner && writerOn &&
    (isQa ? whatsappManualOptOutMode() === "qa" : whatsappManualOptOutMode() === "production" && whatsappManualOptOutSharesCampaignDatabase());
  const planNames = Object.fromEntries(catalog.items.filter((i: { kind: string }) => i.kind === "plan").map((i: { key: string; name: string }) => [i.key, i.name]));

  return <main lang={lang} data-fx-mode={mode} data-fx-theme={theme} className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="bg-slate-950 px-5 py-7 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <HoloLogo label={t.logoLabel} />
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-4">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-cyan-300/60 bg-slate-950"
            style={{ boxShadow: "0 0 18px rgba(34,211,238,.55), 0 0 36px rgba(217,70,239,.35), inset 0 0 18px rgba(59,130,246,.45)" }}>
            <img src="/axiomos-brain-icon.webp" alt="" width={64} height={64} className="h-16 w-16" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot {isQa && "· QA"}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{b.title}</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">{b.subtitle}</p>
          </div>
        </div>
        <div className="grid justify-items-start gap-3 sm:justify-items-end">
          <ExperienceControls lang={lang} mode={mode} theme={theme} />
          <div className="flex items-center gap-3"><Link href="/prospectos/autopilot" className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{t.back}</Link><SignOut lang={lang} /></div>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-5">
      <AppNav t={t} current="brain" optOut={showOptOut} />
      {params.ok && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">{systemMessage(lang, params.ok)}</p>}
      {params.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">{systemMessage(lang, params.error)}</p>}

      {!ready ? <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p>{b.unavailable}</p></section> : <>
        <BrainChat t={b} lang={lang} used={state.used} limit={allowance.limit} suggestions={brainSuggestions(lang)} />

        <section id="plan" aria-label={b.packTitle} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">{b.planLine(allowance.plan?.name ?? "—", allowance.plan?.questions ?? 0, allowance.packs)}</h2>
          <p className="mt-1 text-sm text-slate-600">{b.resets}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {allowance.pack && <div className="rounded-xl border border-blue-200 p-4">
              <h3 className="font-bold">{b.packTitle}</h3>
              <p className="mt-1 text-sm">{b.packLine(allowance.pack.questions.toLocaleString(locale), money(allowance.pack.price_cents))}</p>
              {pendingPurchase ? <div className="mt-3 grid gap-2">
                <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-950">{b.packPending}</p>
                {owner && <form action={cancelBrainPack}><input type="hidden" name="id" value={pendingPurchase.id} />
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{b.cancel}</button></form>}
              </div>
                : owner ? <form action={requestBrainPack} className="mt-3"><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{b.requestPack} · {money(allowance.pack.price_cents)}</button></form>
                  : <p className="mt-3 text-sm text-slate-600">{b.ownerOnly}</p>}
            </div>}
            {allowance.upgrades.length > 0 && <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold">{b.upgradeTitle}</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {allowance.upgrades.map((u) => <li key={u.key}><strong>{u.name}</strong>: {u.questions.toLocaleString(locale)} {b.questionsMonth} ·{" "}
                  {u.promo_cents !== null && u.promo_months ? b.promoThen(money(u.promo_cents), u.promo_months, money(u.regular_cents ?? 0)) : `${money(u.regular_cents ?? 0)} ${b.perMonth}`}</li>)}
              </ul>
              <p className="mt-2 text-xs text-slate-600">{b.upgradeHow}</p>
            </div>}
          </div>
          {state.purchases.length > 0 && <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">{b.history}</summary>
            <ul className="mt-2 grid gap-1">
              {state.purchases.map((p) => <li key={p.id}>{fmtDate.format(new Date(p.requested_at))} · {p.questions.toLocaleString(locale)} · {money(p.price_cents)} · {b.purchaseStatus[p.status] ?? p.status}</li>)}
            </ul>
          </details>}
        </section>

        {isQa && owner && <section aria-label={b.qaTitle} className="rounded-2xl border border-dashed border-amber-400 bg-amber-50 p-6 text-amber-950">
          <h2 className="font-bold">{b.qaTitle}</h2>
          <p className="mt-1 text-sm">{b.qaNote}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {pendingPurchase && <form action={confirmBrainPackTest}><input type="hidden" name="id" value={pendingPurchase.id} />
              <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">{b.qaConfirm}</button></form>}
            <form action={setBrainTestPlan} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-sm">{b.qaPlan}
                <select name="plan" defaultValue={state.account.plan_key} className="rounded-lg border border-amber-300 bg-white px-2 py-2">
                  {BRAIN_PLAN_KEYS.map((k) => <option key={k} value={k}>{planNames[k] ?? k}</option>)}
                </select></label>
              <button className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold">{b.qaApply}</button>
            </form>
            <form action={setBrainTestPlan}><input type="hidden" name="reset" value="1" />
              <button className="rounded-lg border border-amber-500 px-3 py-2 text-sm">{b.qaReset}</button></form>
          </div>
        </section>}
      </>}
    </div>
  </main>;
}
