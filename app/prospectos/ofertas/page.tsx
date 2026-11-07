import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  getOfferState, offerMoney, OFFER_CHANNELS, OFFER_PRODUCTS, puertoRicoLocalDateTime,
} from "../../lib/axira-offers-policy.js";
import { listOfferAudit, listOffers, offersPilotDatabase, offersPilotEnabled } from "../../lib/axira-offers-store.js";
import { createOffer, changeOfferStatus } from "./actions";
import { hasCatalogSession } from "./access";

export const dynamic = "force-dynamic";

type Offer = {
  id: string; checked_at_ms: string; name: string; product_key: keyof typeof OFFER_PRODUCTS;
  normal_cents: number; promo_cents: number; activation_cents: number;
  starts_at: string; ends_at: string; channels: string[]; tax_included: boolean;
  terms_es: string; terms_en: string; external_es: string; external_en: string;
  max_clients: number | null; status: string; revision: number;
};

type Audit = { offer_id: string; revision: number; status: string; actor: string; recorded_at: string };

const states: Record<string, string> = {
  active: "Vigente", scheduled: "Programada", expired: "Vencida",
  draft: "Borrador", paused: "Pausada", unavailable: "Sin verificar", approved: "Aprobada",
};
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600";
const label = "grid gap-1 text-sm font-semibold text-slate-700";
const section = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const channelLabels: Record<string, string> = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" };
const formatDate = new Intl.DateTimeFormat("es-PR", {
  timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short",
});

export default async function OffersPage({ searchParams }: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const reviewOnly = offersPilotEnabled() && process.env.AXIRA_OFFERS_QA_REVIEW_ONLY === "true";
  if (!reviewOnly && !(await hasCatalogSession())) redirect("/prospectos/acceso?from=%2Fprospectos%2Fofertas");

  const search = await searchParams;
  const sql = offersPilotDatabase();
  let offers: Offer[] = [];
  let audit: Audit[] = [];
  let error = sql ? "" : "El catálogo necesita una conexión QA aislada.";
  if (sql) {
    try {
      [offers, audit] = await Promise.all([listOffers(sql), listOfferAudit(sql)]) as [Offer[], Audit[]];
    } catch {
      error = "No pudimos leer el catálogo QA. Verifica la migración y la conexión.";
    }
  }

  const now = offers.length ? Number(offers[0].checked_at_ms) : 0;
  const cards = offers.map((offer) => ({ offer, state: getOfferState(offer, now) }));
  const expiring = cards.filter(({ offer, state }) => state === "active" &&
    Date.parse(offer.ends_at) - now <= 72 * 60 * 60 * 1000);
  const expired = cards.filter(({ state }) => state === "expired");

  return (
    <main className="min-h-screen bg-slate-100 pb-12 text-slate-900">
      <header className="bg-slate-950 px-5 py-9 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · QA</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Ofertas de Axira</h1>
          <p className="mt-2 max-w-2xl text-slate-300">Programa la publicación, revisa las condiciones y verifica qué puede cotizar Axira. Los horarios se muestran en hora de Puerto Rico.</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 pt-5">
        {reviewOnly && <p role="status" className="rounded-xl bg-blue-50 p-4 text-blue-950">Vista de revisión QA. Los formularios están deshabilitados.</p>}
        {search.ok && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{search.ok}</p>}
        {(search.error || error) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{search.error || error}</p>}

        <section aria-label="Estado del catálogo" className="grid gap-3 sm:grid-cols-3">
          {[
            ["Vigentes", cards.filter(({ state }) => state === "active").length],
            ["Por revisar", cards.filter(({ state }) => state === "draft").length],
            ["Vencen en 72 horas", expiring.length],
          ].map(([name, count]) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-600">{name}</p>
              <p className="mt-1 text-3xl font-bold">{error ? "—" : count}</p>
            </div>
          ))}
        </section>

        {(expiring.length > 0 || expired.length > 0) && (
          <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <h2 className="font-bold">Revisión de promociones</h2>
            {expiring.length > 0 && <p className="mt-1 text-sm">Próximas a vencer. {expiring.map(({ offer }) => offer.name).join(", ")}.</p>}
            {expired.length > 0 && <p className="mt-1 text-sm">{expired.length} vencidas. Para sustituir una, revisa el margen y la demanda antes de crear un borrador con nuevas fechas.</p>}
          </aside>
        )}

        <section className={section}>
          <h2 className="text-xl font-bold">Crear borrador</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Completa las condiciones que Axira debe comunicar junto al precio. Incluye su versión en inglés si deseas cotizar en ese idioma.</p>
          <form action={createOffer}>
            <fieldset disabled={Boolean(error) || reviewOnly} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="requestId" value={randomUUID()} />
              <label className={label}>Nombre de la oferta
                <input className={input} name="name" required minLength={3} maxLength={80} />
              </label>
              <label className={label}>Servicio
                <select className={input} name="product" required defaultValue="">
                  <option value="" disabled>Selecciona un servicio</option>
                  {Object.entries(OFFER_PRODUCTS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </label>
              {[
                ["normal", "Precio regular mensual (USD)"],
                ["promo", "Precio promocional mensual (USD)"],
                ["activation", "Costo de activación (USD)"],
              ].map(([name, text]) => (
                <label className={label} key={name}>{text}
                  <input className={input} name={name} type="number" required min={0} max={999999.99} step="0.01" />
                </label>
              ))}
              <label className={label}>Impuestos
                <select className={input} name="tax" required defaultValue="">
                  <option value="" disabled>Selecciona cómo se aplican</option>
                  <option value="included">Incluidos</option>
                  <option value="excluded">Se cobran aparte</option>
                </select>
              </label>
              <label className={label}>Inicio (hora de Puerto Rico)
                <input className={input} name="start" type="datetime-local" required defaultValue={puertoRicoLocalDateTime()} />
              </label>
              <label className={label}>Vencimiento (hora de Puerto Rico)
                <input className={input} name="end" type="datetime-local" required />
              </label>
              {([
                ["termsEs", "Condiciones en español", 120, true],
                ["termsEn", "Condiciones en inglés", 120, false],
                ["externalEs", "Gastos externos en español", 80, true],
                ["externalEn", "Gastos externos en inglés", 80, false],
              ] as const).map(([name, text, length, required]) => (
                <label className={label} key={name}>{text}
                  <input className={input} name={name} required={required} maxLength={length} />
                </label>
              ))}
              <label className={label}>Clientes máximos (opcional)
                <input className={input} name="maxClients" type="number" min={1} max={10000} step={1} />
              </label>
              <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <legend className="mb-1 font-semibold text-slate-700">Canales autorizados</legend>
                {OFFER_CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-center gap-1.5">
                    <input type="checkbox" name="channels" value={channel} />{channelLabels[channel]}
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="w-fit rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Guardar borrador</button>
            </fieldset>
          </form>
        </section>

        <section className={section}>
          <h2 className="mb-4 text-xl font-bold">Catálogo</h2>
          {!offers.length && !error && <p className="text-slate-600">El catálogo está listo para su primer borrador.</p>}
          <div className="grid gap-3">
            {cards.map(({ offer, state }) => {
              const target = offer.status === "approved" ? "paused" : "approved";
              const approval = target === "approved";
              const confirmation = approval ? "APROBAR" : "PAUSAR";
              return (
                <article key={offer.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{offer.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${state === "active" ? "bg-green-100 text-green-900" : "bg-slate-100 text-slate-800"}`}>{states[state]}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{OFFER_PRODUCTS[offer.product_key]} · v{offer.revision} · {offer.channels.map((channel) => channelLabels[channel]).join(", ")}</p>
                  <p className="mt-2 text-sm">{offerMoney(offer.promo_cents)}/mes · regular {offerMoney(offer.normal_cents)} · activación {offerMoney(offer.activation_cents)}</p>
                  <p className="text-sm">Del {formatDate.format(new Date(offer.starts_at))} al {formatDate.format(new Date(offer.ends_at))} (PR)</p>
                  <p className="text-sm">{offer.tax_included ? "Impuestos incluidos." : "Impuestos aparte."} {offer.terms_es} Gastos externos. {offer.external_es}</p>
                  {(offer.terms_en || offer.external_en) && <p className="text-sm" lang="en">{offer.terms_en} External charges. {offer.external_en}</p>}
                  {offer.max_clients && <p className="text-sm">Máximo anunciado de {offer.max_clients}. Disponibilidad por confirmar.</p>}
                  {!reviewOnly && state !== "expired" && Date.parse(offer.ends_at) > now && (
                    <form action={changeOfferStatus} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={offer.id} />
                      <input type="hidden" name="revision" value={offer.revision} />
                      <input type="hidden" name="target" value={target} />
                      <label className={label}>Escribe {confirmation}
                        <input className={input} name="confirmation" autoComplete="off" required />
                      </label>
                      <label className={label}>Clave de administración QA
                        <input className={input} type="password" name="approvalKey" autoComplete="off" required />
                      </label>
                      <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                        {approval ? "Aprobar oferta" : "Pausar oferta"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {audit.length > 0 && (
          <section className={section}>
            <h2 className="mb-3 text-xl font-bold">Historial reciente</h2>
            <p className="mb-3 text-sm text-slate-600">Los cambios de este piloto se atribuyen a la credencial QA compartida.</p>
            <ul className="grid gap-2 text-sm text-slate-700">
              {audit.map((event) => (
                <li key={`${event.offer_id}-${event.revision}`}>{formatDate.format(new Date(event.recorded_at))} · Oferta #{event.offer_id} · v{event.revision} · {states[event.status]}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
