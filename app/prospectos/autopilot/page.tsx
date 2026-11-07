import { redirect } from "next/navigation";
import { getOfferState, offerMoney, OFFER_PRODUCTS } from "../../lib/axira-offers-policy.js";
import { listOffers } from "../../lib/axira-offers-store.js";
import { qaIdentityDatabase, qaMember } from "../../lib/qa-identity";
import { qaIdentityAuth } from "../../lib/qa-identity-auth";
import SignOut from "./sign-out";

export const dynamic = "force-dynamic";
type Offer = {
  id: string; checked_at_ms: string; name: string; product_key: keyof typeof OFFER_PRODUCTS;
  promo_cents: number; normal_cents: number; starts_at: string; ends_at: string;
  status: string; revision: number;
};
const labels: Record<string, string> = {
  active: "Vigente", scheduled: "Programada", expired: "Vencida",
  draft: "Borrador", paused: "Pausada", unavailable: "Sin verificar",
};
const dateFormat = new Intl.DateTimeFormat("es-PR", {
  timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short",
});

export default async function AutopilotQaPage() {
  const auth = qaIdentityAuth(), sql = qaIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1>Acceso individual QA no configurado</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await qaMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>No se pudo verificar tu permiso</h1></main>; }
  if (!membership) return <main className="p-8"><h1>Tu cuenta no tiene permiso para esta empresa</h1><SignOut /></main>;

  let offers: Offer[] = [];
  let catalogError = false;
  try { offers = await listOffers(sql) as Offer[]; }
  catch { catalogError = true; }
  const now = offers.length ? Number(offers[0].checked_at_ms) : 0;
  const catalog = offers.map((offer) => ({ offer, state: getOfferState(offer, now) }));
  const active = catalog.filter(({ state }) => state === "active");
  const drafts = catalog.filter(({ state }) => state === "draft");
  const expiring = active.filter(({ offer }) => Date.parse(offer.ends_at) - now <= 72 * 60 * 60 * 1000);
  const role = { owner: "Propietario", operator: "Operador", viewer: "Consulta" }[membership.role];

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <header className="bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · QA</p>
          <h1 className="mt-2 text-3xl font-bold">Hola, {data.user.name || data.user.email}</h1>
          <p className="mt-2 text-slate-300">AxiomAI Solutions · {role} · Solo lectura</p>
        </div>
        <SignOut />
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7">
      <section aria-label="Resumen de Axira" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Resumen verificable</p>
        <h2 className="mt-2 text-2xl font-bold">Estado comercial</h2>
        {catalogError ? <p role="alert" className="mt-3 text-red-800">No se pudo consultar el catálogo QA. No se muestran cifras ni recomendaciones.</p>
          : <p className="mt-3 text-slate-700">
            {active.length === 0 ? "No hay promociones vigentes y aprobadas en este catálogo QA." : `${active.length} promociones vigentes en este catálogo QA.`}
            {drafts.length > 0 && ` ${drafts.length} ${drafts.length === 1 ? "borrador espera" : "borradores esperan"} revisión.`}
            {expiring.length > 0 && ` ${expiring.length} ${expiring.length === 1 ? "vence" : "vencen"} en las próximas 72 horas.`}
          </p>}
        <p className="mt-3 text-sm text-slate-600">Fuente: Neon QA aislado. Las ofertas actuales son datos sintéticos de prueba. Este panel no representa el CRM de producción.</p>
      </section>
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["Promociones vigentes", active.length], ["Por revisar", drafts.length],
          ["Vencen en 72 horas", expiring.length], ["Prospectos", "Sin conexión QA"],
        ] as const).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-bold">{catalogError && label !== "Prospectos" ? "—" : value}</p>
        </div>)}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Catálogo comercial QA</h2>
        <p className="mt-1 text-sm text-slate-600">El estado se calcula al consultar la base. Horarios en Puerto Rico.</p>
        {!catalogError && catalog.length === 0 && <p className="mt-4">No hay ofertas registradas en esta base QA.</p>}
        {!catalogError && <ul className="mt-4 grid gap-3">
          {catalog.map(({ offer, state }) => <li key={offer.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{offer.name}</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{labels[state] || "Sin verificar"}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{OFFER_PRODUCTS[offer.product_key]} · revisión {offer.revision}</p>
            <p className="mt-1 text-sm">{offerMoney(offer.promo_cents)}/mes · regular {offerMoney(offer.normal_cents)}</p>
            <p className="mt-1 text-sm text-slate-600">Hasta {dateFormat.format(new Date(offer.ends_at))} (PR)</p>
          </li>)}
        </ul>}
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-bold">Próxima conexión</h2>
        <p className="mt-1 text-sm">Prospectos, conversaciones y seguimiento todavía no están conectados a esta rama QA. Este panel no envía mensajes ni activa automatizaciones.</p>
      </section>
    </div>
  </main>;
}
