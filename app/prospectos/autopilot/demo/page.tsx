import { notFound } from "next/navigation";
import BrainButton from "../brain-button";
import { AXIOMAI_TENANT, axiraCatalogReader, loadPublishedCatalog } from "../../../lib/axira-catalog-store.js";
import AppNav from "../app-nav";
import ExperienceControls from "../experience-controls";
import FuturoFx from "../futuro-fx";
import HoloLogo from "../holo-logo";
import { uiPrefs } from "../prefs";
import DemoTour from "./demo-tour";
import { demoText } from "./demo-data";

export const dynamic = "force-dynamic";

// Recorrido para que un cliente explore el CRM con datos de demostración.
// No requiere cuenta porque no muestra datos reales: solo ejemplos y el catálogo publicado (precios
// públicos que Axira ya comunica). Activo en vistas de prueba; en producción solo si se habilita.
export default async function DemoPage() {
  const enabled = process.env.VERCEL_ENV === "preview" || process.env.AXIOMOS_DEMO_TOUR_ENABLED === "true";
  if (!enabled) notFound();
  const { lang, mode, theme, t } = await uiPrefs();
  const d = demoText(lang);
  const loaded = await loadPublishedCatalog(axiraCatalogReader(), AXIOMAI_TENANT, "whatsapp");
  const catalog = JSON.parse(JSON.stringify({ status: loaded.status, items: loaded.items ?? [], knowledge: loaded.knowledge ?? [] }));

  return <main lang={lang} data-fx-mode={mode} data-fx-theme={theme} className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="fx-has-brain bg-slate-950 px-5 py-7 text-white">
      <BrainButton label={t.brainButton} />
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <HoloLogo label={t.backToCrm} href="/prospectos/autopilot" />
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · {d.badge}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{d.title}</h1>
        </div>
        <ExperienceControls lang={lang} mode={mode} theme={theme} />
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-5">
      <AppNav t={t} current="demo" />
      <DemoTour lang={lang} catalog={catalog} />
    </div>
  </main>;
}
