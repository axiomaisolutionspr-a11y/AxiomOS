import { notFound, redirect } from "next/navigation";
import { AXIOMAI_TENANT, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { brainOwnerEnabled, canAskBrain } from "../../../lib/brain-owner-policy.js";
import { brainMonthlyLimit, brainUsage } from "../../../lib/brain-usage-store.js";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import AppNav from "../app-nav";
import ExperienceControls from "../experience-controls";
import FuturoFx from "../futuro-fx";
import HoloLogo from "../holo-logo";
import { uiPrefs } from "../prefs";
import SignOut from "../sign-out";
import BrainChat from "./brain-chat";

export const dynamic = "force-dynamic";

// Brain: asistente del dueño dentro de AxiomOS. Solo si BRAIN_OWNER_ENABLED=true y con sesión de owner/operator.
export default async function BrainPage() {
  if (!brainOwnerEnabled(process.env)) notFound();
  const { lang, mode, theme, t } = await uiPrefs();
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1>{t.accessUnavailable}</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>{t.permissionFailed}</h1></main>; }
  if (!canAskBrain(membership)) return <main className="p-8"><h1>{t.brainNoAccess}</h1><SignOut lang={lang} /></main>;

  const limit = brainMonthlyLimit(process.env);
  let used: number | null = null;
  const counter = neonCatalogDb(commercialOfferWriterDatabase());
  if (counter) {
    try { used = await brainUsage(counter, AXIOMAI_TENANT); }
    catch { used = null; }
  }

  return <main lang={lang} data-fx-mode={mode} data-fx-theme={theme} className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="bg-slate-950 px-5 py-7 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <HoloLogo label={t.logoLabel} />
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · {t.brainBadge}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t.brainTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{t.brainIntro}</p>
        </div>
        <ExperienceControls lang={lang} mode={mode} theme={theme} />
      </div>
    </header>
    <div className="mx-auto grid max-w-3xl gap-5 px-4 py-6 sm:px-5">
      <AppNav t={t} current="brain" />
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t.brainLimitedNote}</p>
      <BrainChat lang={lang} initialUsed={used} limit={limit} />
    </div>
  </main>;
}
