import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { createOffer, changeOfferStatus } from "./actions";
import { puertoRicoDateISO } from "../../lib/axira-offers-policy.js";

export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; description: string; monthly_usd: string;
  activation_usd: string; start_date: string; end_date: string;
  terms: string; max_clients: number | null; status: string;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1";
const money = (s: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(s));

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const search = await searchParams;
  const today = puertoRicoDateISO();
  let offers: Row[] = [];
  let error = "";
  try {
    if (!process.env.DATABASE_URL) throw new Error("Conexión no configurada");
    const sql = neon(process.env.DATABASE_URL);
    offers = await sql`
      SELECT id::text AS id, name, description,
        monthly_usd::text AS monthly_usd, activation_usd::text AS activation_usd,
        TO_CHAR(start_date,'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date,'YYYY-MM-DD') AS end_date,
        terms, max_clients, status
      FROM axiomai_offers ORDER BY created_at DESC, id DESC LIMIT 80
    ` as Row[];
  } catch {
    error = "El catálogo todavía no está habilitado en esta base de datos. Falta aplicar la migración y verificar la conexión.";
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">AxiomOS · CRM</p>
            <h1 className="text-3xl font-bold">Ofertas de Axira</h1>
            <p className="mt-2 text-slate-600">Fecha comercial de Puerto Rico: {today}. Solamente se anuncian ofertas aprobadas y vigentes.</p>
          </div>
          <Link href="/prospectos/simple" className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Volver al CRM</Link>
        </div>
        {search.ok && <p role="status" className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">{search.ok}</p>}
        {search.error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">{search.error}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">{error}</p>}

        <section className="mb-7 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold">Crear una oferta nueva</h2>
          <p className="mb-5 text-sm text-slate-600">Primero se guarda como borrador. Revisa precios, condiciones y fechas antes de aprobarla. Ninguna oferta se envía automáticamente por campañas.</p>
          <form action={createOffer} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="name">Nombre de la oferta</label><input className={inputClass} id="name" name="name" required minLength={3} maxLength={100} placeholder="Ej. WhatsApp Inicio · noviembre" /></div>
            <div><label className={labelClass} htmlFor="description">Descripción breve</label><input className={inputClass} id="description" name="description" maxLength={300} placeholder="Qué incluye el plan (sin promesas no aprobadas)" /></div>
            <div><label className={labelClass} htmlFor="monthly">Precio mensual (USD)</label><input className={inputClass} id="monthly" name="monthly" type="number" required min={0} max={999999} step="0.01" placeholder="39.00" /></div>
            <div><label className={labelClass} htmlFor="activation">Activación (USD)</label><input className={inputClass} id="activation" name="activation" type="number" required min={0} max={999999} step="0.01" placeholder="0.00" /></div>
            <div><label className={labelClass} htmlFor="startDate">Comienza el (incluido)</label><input className={inputClass} id="startDate" name="startDate" type="date" required defaultValue={today} /></div>
            <div><label className={labelClass} htmlFor="endDate">Termina el (incluido)</label><input className={inputClass} id="endDate" name="endDate" type="date" required /></div>
            <div><label className={labelClass} htmlFor="maxClients">Cupos máximos (opcional)</label><input className={inputClass} id="maxClients" name="maxClients" type="number" min={1} max={10000} step={1} placeholder="Ej. 3" /></div>
            <div><label className={labelClass} htmlFor="terms">Condiciones (impuestos, contrato, consumos, exclusiones)</label><textarea className={inputClass} id="terms" name="terms" maxLength={600} rows={2} placeholder="Ej. Contrato inicial de 12 meses; consumos externos aparte." /></div>
            <div className="sm:col-span-2"><button type="submit" disabled={Boolean(error)} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">Guardar borrador</button></div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">Catálogo y fechas</h2>
          {!offers.length && !error && <p className="text-slate-600">Todavía no se han registrado ofertas. Axira no anunciará tarifas promocionales.</p>}
          <div className="grid gap-4">
          {offers.map((offer) => {
            const live = offer.status === "approved" && offer.start_date <= today && offer.end_date >= today;
            const state = live ? "VIGENTE" : offer.status === "approved" ? (offer.end_date < today ? "VENCIDA" : "PROGRAMADA") : offer.status === "draft" ? "BORRADOR" : "PAUSADA";
            return <article key={offer.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div><h3 className="text-lg font-bold">{offer.name}</h3><p className="mt-1 text-slate-600">{money(offer.monthly_usd)}/mes · activación {money(offer.activation_usd)}</p></div>
                <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${live ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{state}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">Del {offer.start_date} al {offer.end_date} · {offer.max_clients ? `Hasta ${offer.max_clients} clientes (disponibilidad por confirmar)` : "Sin cupos especificados"}</p>
              {offer.description && <p className="mt-2 text-sm">{offer.description}</p>}
              {offer.terms && <p className="mt-2 text-sm text-slate-600">Condiciones: {offer.terms}</p>}
              {offer.status !== "approved" && offer.end_date >= today &&
                <form action={changeOfferStatus} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={offer.id}/><input type="hidden" name="target" value="approved"/>
                  <div><label className={labelClass}>Escribe APROBAR</label><input className={inputClass} name="confirmation" autoComplete="off" required placeholder="APROBAR"/></div>
                  <div><label className={labelClass}>Clave de publicación</label><input className={inputClass} type="password" name="approvalKey" autoComplete="off" required/></div>
                  <button type="submit" className="rounded-xl bg-green-700 px-4 py-3 font-bold text-white">Aprobar oferta</button>
                </form>
              }
              {offer.status === "approved" &&
                <form action={changeOfferStatus} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={offer.id}/><input type="hidden" name="target" value="paused"/>
                  <div><label className={labelClass}>Escribe PAUSAR</label><input className={inputClass} name="confirmation" autoComplete="off" required placeholder="PAUSAR"/></div>
                  <button type="submit" className="rounded-xl bg-amber-700 px-4 py-3 font-bold text-white">Pausar oferta</button>
                </form>
              }
            </article>;
          })}
          </div>
        </section>
      </div>
    </main>
  );
}
