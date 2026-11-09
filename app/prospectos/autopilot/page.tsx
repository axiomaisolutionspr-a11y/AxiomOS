import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getOfferState, offerMoney, OFFER_CHANNELS, OFFER_PRODUCTS, puertoRicoLocalDateTime } from "../../lib/axira-offers-policy.js";
import { listOffers } from "../../lib/axira-offers-store.js";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../lib/commercial-identity";
import { commercialIdentityAuth } from "../../lib/commercial-identity-auth";
import { changeQaOfferStatus, createQaOffer } from "./offer-actions";
import SignOut from "./sign-out";
import { assignFollowup } from "./assignment-actions";

export const dynamic = "force-dynamic";
type Offer = {
  id: string; checked_at_ms: string; name: string; product_key: keyof typeof OFFER_PRODUCTS;
  promo_cents: number; normal_cents: number; starts_at: string; ends_at: string;
  activation_cents: number; status: string; revision: number; channels: string[];
  tax_included: boolean; terms_es: string; terms_en: string; external_es: string; external_en: string;
  max_clients: number | null;
};
const labels: Record<string, string> = {
  active: "Vigente", scheduled: "Programada", expired: "Vencida",
  draft: "Borrador", paused: "Pausada", unavailable: "Sin verificar",
};
const dateFormat = new Intl.DateTimeFormat("es-PR", {
  timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short",
});

export default async function AutopilotQaPage({ searchParams }: {
  searchParams: Promise<{ok?: string; error?: string}>;
}) {
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1>Acceso comercial no configurado</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
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
  type Assignment = { prospect_id: string; assignee_user_id: string; status: string; revision: number };
  let assignments: Assignment[] = [];
  let assignmentEnabled = false;
  if (process.env.VERCEL_ENV === "production" && process.env.AXIOMOS_AUTOPILOT_ASSIGNMENTS_ENABLED === "true") {
    try {
      const rows = await sql`SELECT prospect_id::text, assignee_user_id::text, status, revision FROM axiomos_commercial.followup_assignments WHERE tenant_id='axiomai' AND (${membership.role === "owner"} OR assignee_user_id=${data.user.id}::uuid) ORDER BY updated_at DESC LIMIT 50`;
      assignments = rows.map(row => ({prospect_id: String(row.prospect_id), assignee_user_id: String(row.assignee_user_id), status:String(row.status), revision:Number(row.revision)}));
      assignmentEnabled = true;
    } catch (cause) {
      console.error("AUTOPILOT_ASSIGNMENTS_UNAVAILABLE", (cause as {code?: string})?.code ?? "unknown");
    }
  }
  let activeAssignees: Array<{user_id:string; role:string}> = [];
  if (assignmentEnabled && membership.role === "owner") {
    try {
      const rows=await sql`SELECT user_id::text,role FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND status='active' AND role IN ('owner','operator') ORDER BY role`;
      activeAssignees=rows.map(r=>({user_id:String(r.user_id),role:String(r.role)}));
    } catch { assignmentEnabled=false; }
  }
  const feedback = await searchParams;

  return <main className="min-h-screen bg-slate-100 text-slate-950">
    <header className="bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot {isQa ? "· QA" : ""}</p>
          <h1 className="mt-2 text-3xl font-bold">Hola, {data.user.name || data.user.email}</h1>
          <p className="mt-2 text-slate-300">AxiomAI Solutions · {role} · {canEdit ? "Gestión de ofertas" : "Solo lectura"}</p>
        </div>
        <SignOut />
      </div>
    </header>
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7">
      {feedback.ok && <p role="status" className="rounded-xl bg-green-100 p-4 text-green-950">{feedback.ok}</p>}
      {feedback.error && <p role="alert" className="rounded-xl bg-red-100 p-4 text-red-950">{feedback.error}</p>}
      <section aria-label="Resumen de Axira" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Resumen verificable</p>
        <h2 className="mt-2 text-2xl font-bold">Estado comercial</h2>
        {catalogError ? <p role="alert" className="mt-3 text-red-800">No se pudo consultar el catálogo. No se muestran cifras ni recomendaciones.</p>
          : <p className="mt-3 text-slate-700">
            {active.length === 0 ? "No hay promociones vigentes y aprobadas en este catálogo." : `${active.length} promociones vigentes en este catálogo.`}
            {drafts.length > 0 && ` ${drafts.length} ${drafts.length === 1 ? "borrador espera" : "borradores esperan"} revisión.`}
            {expiring.length > 0 && ` ${expiring.length} ${expiring.length === 1 ? "vence" : "vencen"} en las próximas 72 horas.`}
          </p>}
        <p className="mt-3 text-sm text-slate-600">Fuente: {isQa ? "Neon QA aislado; datos sintéticos." : "Catálogo comercial autorizado en Neon."} El estado se calcula al consultar la base.</p>
      </section>
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["Promociones vigentes", active.length], ["Por revisar", drafts.length],
          ["Vencen en 72 horas", expiring.length], ["Prospectos", legacyProspectCount ?? "Sin conexión"],
        ] as const).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-bold">{catalogError && label !== "Prospectos" ? "—" : value}</p>
        </div>)}
      </section>
      {prospectSummary && <section aria-label="Resumen de seguimiento" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Resumen de prospectos</h2>
        <p className="mt-2 text-sm text-slate-600">Solo lectura: sin datos personales ni envíos automáticos.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([["Total", "total"], ["Nuevos", "new_count"], ["Interesados", "interested_count"], ["En seguimiento", "followup_count"], ["Perdidos", "lost_count"], ["Seguimientos vencidos", "overdue_count"], ["Próximos 7 días", "due_next_7_days"], ["Sin asignar", "unassigned"]] as const).map(([label, key]) => <div key={key} className="rounded-lg border border-slate-200 p-3"><div className="text-sm text-slate-600">{label}</div><div className="text-2xl font-bold">{prospectSummary![key]}</div></div>)}
        </div>
      </section>}
      {followupReview && <section aria-label="Cola de revisión de seguimiento" className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Seguimientos por revisar · Solo lectura</h2>
        <p className="mt-2 text-sm text-slate-700">Ninguna acción envía mensajes ni altera datos. Verifica consentimiento, identidad y contexto en el CRM anterior antes de contactar a alguien.</p>
        {followupReview.length === 0 ? <p className="mt-3">No hay seguimientos con fecha pendientes de revisión.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Referencia</th><th>Etapa</th><th>Fecha PR</th><th>Prioridad</th></tr></thead><tbody>
          {followupReview.map(item => <tr key={item.prospect_id} className="border-b"><td className="py-2">#{item.prospect_id}</td><td>{item.stage}</td><td>{new Intl.DateTimeFormat("es-PR", {timeZone:"America/Puerto_Rico",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.due_at))}</td><td>{item.priority === "overdue" ? "Vencido · revisar" : "Próximo"}</td></tr>)}
        </tbody></table></div>}
      </section>}
      {assignmentEnabled && <section aria-label="Asignaciones de seguimiento" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Asignaciones internas</h2>
        <p className="mt-2 text-sm text-slate-600">Las asignaciones no envían mensajes y no cambian el CRM anterior. Solo el propietario puede asignar.</p>
        <ul className="mt-4 grid gap-2">{assignments.map(item => <li key={item.prospect_id} className="rounded border p-3 text-sm">Prospecto #{item.prospect_id} · {item.assignee_user_id === "ee187087-e461-47aa-8af2-9aadabc57812" ? "Alex" : item.assignee_user_id === "4d732997-747d-4f21-8f5c-e86f210997d6" ? "Rolando" : "Usuario autorizado"} · {item.status}</li>)}</ul>
        {assignments.length === 0 && <p className="mt-2 text-sm">Sin asignaciones registradas.</p>}
        {membership.role === "owner" && <div className="mt-4 space-y-3">{followupReview?.map(item => {
          const existing=assignments.find(a=>a.prospect_id===item.prospect_id);
          return <form key={item.prospect_id} action={assignFollowup} className="flex flex-wrap items-center gap-3 rounded border p-3">
            <strong>#{item.prospect_id}</strong><span>{item.stage} · {item.priority === "overdue" ? "Vencido" : "Próximo"}</span>
            <input type="hidden" name="prospectId" value={item.prospect_id}/>
            <input type="hidden" name="revision" value={existing?.revision ?? 0}/>
            <select name="assignee" defaultValue={existing?.assignee_user_id ?? ""} required className="rounded border p-2">
              <option value="" disabled>Seleccionar responsable</option>
              {activeAssignees.map(a=><option key={a.user_id} value={a.user_id}>{a.role === "owner" ? "Rolando" : "Alex"}</option>)}
            </select>
            <button type="submit" className="rounded bg-blue-700 px-3 py-2 text-white">Asignar</button>
          </form>;
        })}</div>}
      </section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Catálogo comercial</h2>
        <p className="mt-1 text-sm text-slate-600">El estado se calcula al consultar la base. Horarios en Puerto Rico.</p>
        {!catalogError && catalog.length === 0 && <p className="mt-4">No hay ofertas registradas .</p>}
        {!catalogError && <ul className="mt-4 grid gap-3">
          {catalog.map(({ offer, state }) => <li key={offer.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{offer.name}</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{labels[state] || "Sin verificar"}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{OFFER_PRODUCTS[offer.product_key]} · revisión {offer.revision}</p>
            <p className="mt-1 text-sm">{offerMoney(offer.promo_cents)}/mes · regular {offerMoney(offer.normal_cents)} · activación {offerMoney(offer.activation_cents)}</p>
            <p className="mt-1 text-sm text-slate-600">Del {dateFormat.format(new Date(offer.starts_at))} al {dateFormat.format(new Date(offer.ends_at))} (PR) · canales: {offer.channels.join(", ")}</p>
            <p className="mt-1 text-sm">{offer.tax_included ? "Impuestos incluidos." : "Impuestos aparte."} {offer.terms_es} Gastos externos: {offer.external_es}</p>
            {(offer.terms_en || offer.external_en) && <p className="mt-1 text-sm" lang="en">{offer.terms_en} External charges: {offer.external_en}</p>}
            {offer.max_clients && <p className="mt-1 text-sm">Límite anunciado: {offer.max_clients}. Disponibilidad pendiente de confirmación.</p>}
            {canEdit && state !== "expired" && Date.parse(offer.ends_at) > now && <form action={changeQaOfferStatus} className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
              <input type="hidden" name="id" value={offer.id} />
              <input type="hidden" name="revision" value={offer.revision} />
              <input type="hidden" name="target" value={offer.status === "approved" ? "paused" : "approved"} />
              <label className="grid gap-1 text-sm">Escribe {offer.status === "approved" ? "PAUSAR" : "APROBAR"}
                <input name="confirmation" required autoComplete="off" className="rounded border p-2" />
              </label>
              <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{offer.status === "approved" ? "Pausar" : "Aprobar"}</button>
            </form>}
          </li>)}
        </ul>}
      </section>
      {canEdit && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Crear borrador de oferta</h2>
        <p className="mt-1 text-sm text-slate-600">Guardar no activa una oferta. Debes revisar todas sus condiciones y aprobarla por separado. {isQa ? "Este catálogo QA está aislado de los canales comerciales." : "Una oferta aprobada solo se consultará en los canales habilitados durante su vigencia."}</p>
        <form action={createQaOffer} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="requestId" value={randomUUID()} />
          <label className="grid gap-1 text-sm">Nombre<input name="name" minLength={3} maxLength={80} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Servicio<select name="product" required defaultValue="" className="rounded border p-2"><option value="" disabled>Selecciona</option>{Object.entries(OFFER_PRODUCTS).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
          {([["normal","Precio regular mensual"],["promo","Precio promocional mensual"],["activation","Costo de activación"]] as const).map(([name,label])=><label key={name} className="grid gap-1 text-sm">{label} (USD)<input name={name} type="number" min="0" max="999999.99" step="0.01" required className="rounded border p-2" /></label>)}
          <label className="grid gap-1 text-sm">Inicio (PR)<input name="start" type="datetime-local" required defaultValue={puertoRicoLocalDateTime()} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Vencimiento (PR)<input name="end" type="datetime-local" required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Impuestos<select name="tax" defaultValue="" required className="rounded border p-2"><option value="" disabled>Selecciona</option><option value="included">Incluidos</option><option value="excluded">Aparte</option></select></label>
          <label className="grid gap-1 text-sm">Condiciones (español)<input name="termsEs" maxLength={120} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Condiciones (inglés, opcional)<input name="termsEn" maxLength={120} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Gastos externos (español)<input name="externalEs" maxLength={80} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Gastos externos (inglés, opcional)<input name="externalEn" maxLength={80} className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Clientes máximos (opcional)<input name="maxClients" type="number" min="1" max="10000" className="rounded border p-2" /></label>
          <fieldset className="flex flex-wrap gap-3 text-sm"><legend>Canales permitidos</legend>{OFFER_CHANNELS.map(channel=><label key={channel} className="flex items-center gap-1"><input type="checkbox" name="channels" value={channel} />{channel}</label>)}</fieldset>
          <button className="w-fit rounded bg-blue-700 px-5 py-3 font-semibold text-white">Guardar borrador</button>
        </form>
      </section>}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-bold">Próxima conexión</h2>
        <p className="mt-1 text-sm">Prospectos, conversaciones y seguimiento todavía no están conectados a este panel. Crear o aprobar ofertas no envía mensajes ni activa campañas.</p>
      </section>
    </div>
  </main>;
}
