import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  answerFromCatalog, CATALOG_CHANNELS, KNOWLEDGE_TOPICS, LIMIT_ENFORCEMENT, money, previewCatalog,
  relevantKnowledge, STATUS_LABELS,
} from "../../../lib/axira-catalog-policy.js";
import { AXIOMAI_TENANT, listCatalog, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import SignOut from "../sign-out";
import HoloLogo from "../holo-logo";
import FuturoFx from "../futuro-fx";
import { changeVersion, saveItemDraft, saveKnowledgeDraft } from "./actions";

export const dynamic = "force-dynamic";

type Item = {
  key: string; version: number; kind: "plan" | "service"; name: string; summary: string; category: string;
  pricing_mode: "fixed" | "quote"; billing_period: string | null; regular_cents: number | null; promo_cents: number | null;
  promo_months: number | null; promo_valid_until: string | null; users_included: number | null;
  limits: Record<string, number>; benefits: string[]; restrictions: string[]; channels: string[];
  valid_from: string; valid_until: string | null; status: string; change_reason: string; created_by: string; created_at: string;
};
type Knowledge = {
  key: string; version: number; topic: string; language: string; title: string; answer: string; keywords: string[];
  valid_from: string; valid_until: string | null; status: string; change_reason: string; created_at: string;
};
type Audit = { id: string; entity: string; entity_key: string; version: number; action: string; from_status: string | null;
  to_status: string; actor: string; reason: string; recorded_at: string };

const TABS = { catalogo: "Planes y servicios", conocimiento: "Conocimiento de Axira", "vista-previa": "Vista previa", auditoria: "Auditoría" } as const;
const ACTIONS: Record<string, string> = { create_draft: "Borrador creado", approve: "Aprobada", publish: "Publicada", archive: "Archivada", restore: "Restaurada" };
const BADGE: Record<string, string> = {
  draft: "bg-slate-200 text-slate-800", approved: "bg-amber-100 text-amber-900",
  published: "bg-blue-600 text-white", archived: "bg-slate-100 text-slate-500 line-through",
};
const date = new Intl.DateTimeFormat("es-PR", { timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short" });
const PERIOD: Record<string, string> = { month: "mes", year: "año", one_time: "pago único" };
const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" };
const channelList = (channels: string[]) => channels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ");
const priceLabel = (cents: number, period: string | null) => cents === 0 ? "Gratis" : `${money(cents)}/${PERIOD[period ?? "month"]}`;

function groupByKey<T extends { key: string; version: number }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.key, [...(map.get(row.key) ?? []), row]);
  return [...map.entries()].map(([key, versions]) => ({ key, versions: versions.sort((a, b) => b.version - a.version) }));
}

function Badge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[status] ?? ""}`}>{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}</span>;
}

function VersionActions({ entity, row, canEdit }: { entity: "item" | "knowledge"; row: { key: string; version: number; status: string }; canEdit: boolean }) {
  if (!canEdit) return null;
  const options: Array<[string, string]> = [];
  if (row.status === "draft") options.push(["approved", "Aprobar"]);
  if (row.status === "approved") options.push(["published", "Publicar"]);
  if (row.status !== "archived") options.push(["archived", "Archivar"]);
  if (row.status === "archived" || row.status === "published") options.push(["restore", "Restaurar como nueva versión"]);
  if (!options.length) return null;
  return <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-semibold text-blue-700">Cambiar estado de la v{row.version}</summary>
    <form action={changeVersion} className="mt-3 grid gap-2 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="version" value={row.version} />
      <label className="grid gap-1">Acción
        <select name="target" className="rounded border border-slate-300 bg-white p-2">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="grid gap-1">Confirmación
        <input name="confirmation" required placeholder="APROBAR / PUBLICAR…" className="rounded border border-slate-300 p-2" autoComplete="off" />
      </label>
      <label className="grid gap-1">Motivo
        <input name="reason" required minLength={3} maxLength={300} className="rounded border border-slate-300 p-2" />
      </label>
      <button className="rounded bg-slate-950 px-4 py-2 font-semibold text-white">Confirmar</button>
    </form>
  </details>;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-800">{label}{children}{hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}</label>;
}
const input = "rounded-lg border border-slate-300 bg-white p-2.5 text-base font-normal focus:border-blue-600 focus:outline-none";

function toLocal(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(Date.parse(iso) - 4 * 3600 * 1000).toISOString().slice(0, 16);
}

export default async function CatalogoPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; ok?: string; error?: string; editar?: string; v?: string; q?: string }>;
}) {
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1 className="text-xl font-bold">Acceso comercial no configurado</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>No se pudo verificar tu permiso</h1></main>; }
  if (!membership) return <main className="p-8"><h1>Tu cuenta no tiene permiso para esta empresa</h1><SignOut /></main>;

  const params = await searchParams;
  const tab = (Object.hasOwn(TABS, params.tab ?? "") ? params.tab : "catalogo") as keyof typeof TABS;
  const reader = neonCatalogDb(sql);
  let items: Item[] = [], knowledge: Knowledge[] = [], audit: Audit[] = [];
  let loadError = false;
  try {
    const result = await listCatalog(reader!, AXIOMAI_TENANT);
    items = result.items as Item[]; knowledge = result.knowledge as Knowledge[]; audit = result.audit as Audit[];
  } catch (cause) {
    loadError = true;
    console.error("CATALOG_PANEL_READ_FAILED", (cause as { code?: string })?.code ?? "unknown");
  }
  const canEdit = membership.role === "owner" && !loadError && Boolean(commercialOfferWriterDatabase());
  const isQa = process.env.VERCEL_ENV === "preview";
  // Planes primero; luego servicios por nombre.
  const itemGroups = groupByKey(items).sort((a, b) =>
    (a.versions[0].kind === "plan" ? 0 : 1) - (b.versions[0].kind === "plan" ? 0 : 1) ||
    a.versions[0].name.localeCompare(b.versions[0].name, "es"));
  const knowledgeGroups = groupByKey(knowledge);
  const published = (rows: { status: string }[]) => rows.filter((r) => r.status === "published").length;
  const pending = [...items, ...knowledge].filter((r) => r.status === "draft" || r.status === "approved").length;
  const editItem = params.editar ? items.find((i) => i.key === params.editar && String(i.version) === params.v) : undefined;
  const editKnowledge = params.editar ? knowledge.find((k) => k.key === params.editar && String(k.version) === params.v) : undefined;
  const preview = previewCatalog({ items, knowledge });
  const question = (params.q ?? "").slice(0, 300);
  const previewAnswer = question ? answerFromCatalog(preview, { message: question, channel: "whatsapp" }) : null;
  const previewKnowledge = (question ? relevantKnowledge(preview, question) : []) as Array<{ key: string; title: string }>;

  return <main className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="bg-slate-950 px-5 py-7 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <HoloLogo />
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · Configuración {isQa && "· QA"}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Centro Comercial y Conocimiento de Axira</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Precios, ofertas, servicios y respuestas que Axira puede usar. Axira solo consulta lo <strong className="text-white">publicado y vigente</strong>.</p>
        </div>
        <div className="flex items-center gap-3"><Link href="/prospectos/autopilot" className="rounded-lg border border-slate-600 px-3 py-2 text-sm">← Autopilot</Link><SignOut /></div>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-5">
      {params.ok && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">{params.ok}</p>}
      {params.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">{params.error}</p>}
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">No se pudo leer el catálogo (¿falta aplicar la migración v2 en esta base?).</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen">
        {[["Planes publicados", published(items.filter((i) => i.kind === "plan"))], ["Servicios publicados", published(items.filter((i) => i.kind === "service"))],
          ["Conocimientos publicados", published(knowledge)], ["Pendientes de aprobar o publicar", pending]].map(([label, value]) =>
          <div key={label as string} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-3xl font-bold text-blue-700">{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p></div>)}
      </section>

      <nav className="flex gap-2 overflow-x-auto" aria-label="Secciones">
        {Object.entries(TABS).map(([key, label]) => <Link key={key} href={`?tab=${key}`} aria-current={tab === key ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>{label}</Link>)}
      </nav>
      <p className="text-sm text-slate-600">Rol: {membership.role === "owner" ? "Propietario (puede editar)" : "Solo lectura"}{!canEdit && membership.role === "owner" && " · la escritura no está habilitada en este entorno"}</p>

      {tab === "catalogo" && <>
        <section className="grid gap-4">
          {itemGroups.length === 0 && !loadError && <p className="rounded-xl bg-white p-5">Todavía no hay planes ni servicios.</p>}
          {itemGroups.map(({ key, versions }) => {
            const current = versions.find((v) => v.status === "published") ?? versions[0];
            return <article key={key} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-lg font-bold">{current.name}</h2><p className="text-xs text-slate-500">{current.kind === "plan" ? "Plan" : "Servicio"} · clave {key}{current.category && ` · ${current.category}`}</p></div>
                <Badge status={current.status} />
              </div>
              <p className="mt-2 text-lg font-semibold text-blue-700">{current.pricing_mode === "quote" ? "Cotización personalizada"
                : current.promo_cents !== null ? `${money(current.promo_cents)}/${PERIOD[current.billing_period ?? "month"]} × ${current.promo_months} meses → ${money(current.regular_cents ?? 0)}`
                : priceLabel(current.regular_cents ?? 0, current.billing_period)}</p>
              {current.summary && <p className="mt-1 text-sm text-slate-700">{current.summary}</p>}
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {current.users_included && <li className="rounded bg-slate-100 px-2 py-1">{current.users_included} usuarios</li>}
                {Number.isInteger(current.limits?.call_minutes) && <li className="rounded bg-slate-100 px-2 py-1">{current.limits.call_minutes} min de llamadas</li>}
                {Number.isInteger(current.limits?.axira_responses) && <li className="rounded bg-slate-100 px-2 py-1">{current.limits.axira_responses} respuestas de Axira/mes</li>}
                <li className="rounded bg-slate-100 px-2 py-1">Canales: {channelList(current.channels)}</li>
              </ul>
              {current.benefits.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{current.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
              {current.promo_valid_until && <p className="mt-1 text-xs text-slate-600">Promoción disponible hasta {date.format(new Date(current.promo_valid_until))} (PR)</p>}
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Versiones ({versions.length})</summary>
                <ul className="mt-2 grid gap-3">{versions.map((v) => <li key={v.version} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><strong>v{v.version}</strong><Badge status={v.status} />
                    <span className="text-xs text-slate-500">{date.format(new Date(v.created_at))} · {v.change_reason || "sin motivo"}</span></div>
                  <p className="mt-1">{v.pricing_mode === "quote" ? "Cotización" : `${v.promo_cents !== null ? `${money(v.promo_cents)} × ${v.promo_months} m → ` : ""}${money(v.regular_cents ?? 0)}`}</p>
                  {canEdit && <Link className="mt-2 inline-block text-sm font-semibold text-blue-700" href={`?tab=catalogo&editar=${v.key}&v=${v.version}#formulario`}>Crear nueva versión a partir de esta</Link>}
                  <VersionActions entity="item" row={v} canEdit={canEdit} />
                </li>)}</ul>
              </details>
            </article>;
          })}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-bold">Límites ofrecidos vs. controles técnicos</h2>
          <ul className="mt-1 list-disc pl-5">{Object.values(LIMIT_ENFORCEMENT).map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="mt-1">Axira informa estos límites como condiciones comerciales; todavía no se aplican automáticamente.</p>
        </section>

        {canEdit && <section id="formulario" className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold">{editItem ? `Nueva versión de “${editItem.name}”` : "Nuevo plan o servicio (borrador)"}</h2>
          <p className="mt-1 text-sm text-slate-600">Guardar crea un borrador. Después debes aprobarlo y publicarlo. Las versiones anteriores no se borran.</p>
          <form action={saveItemDraft} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Clave única" hint="minúsculas y guiones, ej. axiomos-autopilot"><input name="key" required defaultValue={editItem?.key} readOnly={Boolean(editItem)} className={input} /></Field>
            <Field label="Nombre"><input name="name" required minLength={3} maxLength={80} defaultValue={editItem?.name} className={input} /></Field>
            <Field label="Tipo"><select name="kind" defaultValue={editItem?.kind ?? "plan"} className={input}><option value="plan">Plan</option><option value="service">Servicio</option></select></Field>
            <Field label="Categoría"><input name="category" maxLength={60} defaultValue={editItem?.category} className={input} /></Field>
            <Field label="Descripción"><textarea name="summary" maxLength={400} rows={2} defaultValue={editItem?.summary} className={input} /></Field>
            <Field label="Precio"><select name="pricingMode" defaultValue={editItem?.pricing_mode ?? "fixed"} className={input}><option value="fixed">Precio fijo</option><option value="quote">Cotización personalizada</option></select></Field>
            <Field label="Precio regular (USD)" hint="vacío si es cotización"><input name="regular" inputMode="decimal" defaultValue={editItem?.regular_cents != null ? (editItem.regular_cents / 100).toFixed(2) : ""} className={input} /></Field>
            <Field label="Periodicidad"><select name="billingPeriod" defaultValue={editItem?.billing_period ?? "month"} className={input}><option value="month">Mensual</option><option value="year">Anual</option><option value="one_time">Pago único</option></select></Field>
            <Field label="Precio promocional (USD)" hint="opcional"><input name="promo" inputMode="decimal" defaultValue={editItem?.promo_cents != null ? (editItem.promo_cents / 100).toFixed(2) : ""} className={input} /></Field>
            <Field label="Meses de promoción por cliente"><input name="promoMonths" inputMode="numeric" defaultValue={editItem?.promo_months ?? ""} className={input} /></Field>
            <Field label="Promoción disponible hasta (hora PR)" hint="opcional; al vencer Axira ofrece solo el precio regular"><input type="datetime-local" name="promoValidUntil" defaultValue={toLocal(editItem?.promo_valid_until)} className={input} /></Field>
            <Field label="Usuarios incluidos"><input name="usersIncluded" inputMode="numeric" defaultValue={editItem?.users_included ?? ""} className={input} /></Field>
            <Field label="Minutos de llamadas incluidos"><input name="callMinutes" inputMode="numeric" defaultValue={editItem?.limits?.call_minutes ?? ""} className={input} /></Field>
            <Field label="Respuestas de Axira al mes"><input name="axiraResponses" inputMode="numeric" defaultValue={editItem?.limits?.axira_responses ?? ""} className={input} /></Field>
            <Field label="Beneficios" hint="uno por línea"><textarea name="benefits" rows={4} defaultValue={editItem?.benefits.join("\n")} className={input} /></Field>
            <Field label="Restricciones" hint="una por línea"><textarea name="restrictions" rows={4} defaultValue={editItem?.restrictions.join("\n")} className={input} /></Field>
            <Field label="Vigente desde (hora PR)" hint="vacío = ahora"><input type="datetime-local" name="validFrom" className={input} /></Field>
            <Field label="Vigente hasta (hora PR)" hint="opcional"><input type="datetime-local" name="validUntil" defaultValue={toLocal(editItem?.valid_until)} className={input} /></Field>
            <fieldset className="grid gap-2 text-sm sm:col-span-2"><legend className="font-medium">Canales donde Axira puede ofrecerlo</legend>
              <div className="flex flex-wrap gap-4">{CATALOG_CHANNELS.map((c: string) => <label key={c} className="flex items-center gap-2"><input type="checkbox" name="channels" value={c} defaultChecked={!editItem || editItem.channels.includes(c)} />{CHANNEL_LABELS[c] ?? c}</label>)}</div>
            </fieldset>
            <Field label="Motivo del cambio (auditoría)"><input name="reason" required minLength={3} maxLength={300} className={input} /></Field>
            <div className="sm:col-span-2"><button className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white sm:w-auto">Guardar borrador</button></div>
          </form>
        </section>}
      </>}

      {tab === "conocimiento" && <>
        <section className="grid gap-4">
          {knowledgeGroups.length === 0 && !loadError && <p className="rounded-xl bg-white p-5">Todavía no hay conocimientos.</p>}
          {knowledgeGroups.map(({ key, versions }) => {
            const current = versions.find((v) => v.status === "published") ?? versions[0];
            return <article key={key} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="font-bold">{current.title}</h2><p className="text-xs text-slate-500">{KNOWLEDGE_TOPICS[current.topic as keyof typeof KNOWLEDGE_TOPICS]} · {current.language.toUpperCase()} · clave {key}</p></div>
                <Badge status={current.status} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{current.answer}</p>
              {current.keywords.length > 0 && <p className="mt-2 text-xs text-slate-500">Palabras clave: {current.keywords.join(", ")}</p>}
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Versiones ({versions.length})</summary>
                <ul className="mt-2 grid gap-3">{versions.map((v) => <li key={v.version} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><strong>v{v.version}</strong><Badge status={v.status} /><span className="text-xs text-slate-500">{date.format(new Date(v.created_at))} · {v.change_reason || "sin motivo"}</span></div>
                  {canEdit && <Link className="mt-2 inline-block text-sm font-semibold text-blue-700" href={`?tab=conocimiento&editar=${v.key}&v=${v.version}#formulario`}>Crear nueva versión a partir de esta</Link>}
                  <VersionActions entity="knowledge" row={v} canEdit={canEdit} />
                </li>)}</ul>
              </details>
            </article>;
          })}
        </section>
        {canEdit && <section id="formulario" className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold">{editKnowledge ? `Nueva versión de “${editKnowledge.title}”` : "Nuevo conocimiento (borrador)"}</h2>
          <form action={saveKnowledgeDraft} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Clave única"><input name="key" required defaultValue={editKnowledge?.key} readOnly={Boolean(editKnowledge)} className={input} /></Field>
            <Field label="Tema"><select name="topic" defaultValue={editKnowledge?.topic ?? "faq"} className={input}>{Object.entries(KNOWLEDGE_TOPICS).map(([v, l]) => <option key={v} value={v}>{l as string}</option>)}</select></Field>
            <Field label="Idioma"><select name="language" defaultValue={editKnowledge?.language ?? "es"} className={input}><option value="es">Español</option><option value="en">Inglés</option></select></Field>
            <Field label="Título o pregunta"><input name="title" required minLength={3} maxLength={160} defaultValue={editKnowledge?.title} className={input} /></Field>
            <div className="sm:col-span-2"><Field label="Respuesta autorizada"><textarea name="answer" required minLength={3} maxLength={1500} rows={5} defaultValue={editKnowledge?.answer} className={input} /></Field></div>
            <Field label="Palabras clave" hint="separadas por comas"><input name="keywords" defaultValue={editKnowledge?.keywords.join(", ")} className={input} /></Field>
            <Field label="Vigente hasta (hora PR)" hint="opcional"><input type="datetime-local" name="validUntil" defaultValue={toLocal(editKnowledge?.valid_until)} className={input} /></Field>
            <Field label="Motivo del cambio (auditoría)"><input name="reason" required minLength={3} maxLength={300} className={input} /></Field>
            <div className="sm:col-span-2"><button className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white sm:w-auto">Guardar borrador</button></div>
          </form>
        </section>}
      </>}

      {tab === "vista-previa" && <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold">¿Cómo respondería Axira?</h2>
        <p className="mt-1 text-sm text-slate-600">Usa las versiones <strong>aprobadas y publicadas</strong> (no los borradores) para que veas el resultado antes de publicar. No envía mensajes ni usa créditos de IA.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="tab" value="vista-previa" />
          <input name="q" defaultValue={question} placeholder="¿Cuánto cuesta AxiomOS Autopilot?" className={`${input} flex-1`} />
          <button className="rounded-lg bg-slate-950 px-5 py-2.5 font-semibold text-white">Probar</button>
        </form>
        {question && <div className="mt-4 grid gap-3">
          <div className="rounded-xl bg-slate-100 p-3 text-sm"><span className="font-semibold">Cliente:</span> {question}</div>
          <div className="rounded-xl bg-blue-600 p-3 text-sm text-white"><span className="font-semibold">Axira:</span> {previewAnswer
            ? previewAnswer.reply : "No es una pregunta de precios: Axira respondería con IA usando el contexto aprobado de abajo."}</div>
          {previewKnowledge.length > 0 && <div className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-semibold">Conocimientos que recibiría como contexto:</p>
            <ul className="mt-1 list-disc pl-5">{previewKnowledge.map((k) => <li key={k.key}>{k.title}</li>)}</ul></div>}
        </div>}
      </section>}

      {tab === "auditoria" && <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold">Historial de cambios</h2>
        <p className="mt-1 text-sm text-slate-600">Quién cambió qué, cuándo y por qué. Cada evento guarda una copia completa de la versión. Este registro no se puede editar ni borrar.</p>
        <ul className="mt-4 grid gap-2">{audit.map((a) => <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><strong>{ACTIONS[a.action] ?? a.action}</strong><span className="text-slate-600">{a.entity === "item" ? "Catálogo" : "Conocimiento"} · {a.entity_key} v{a.version}</span>
            <span className="text-xs text-slate-500">{a.from_status ? `${STATUS_LABELS[a.from_status as keyof typeof STATUS_LABELS]} → ` : ""}{STATUS_LABELS[a.to_status as keyof typeof STATUS_LABELS]}</span></div>
          <p className="mt-1 text-xs text-slate-500">{date.format(new Date(a.recorded_at))} · {a.actor} · {a.reason || "sin motivo"}</p>
        </li>)}</ul>
      </section>}
    </div>
  </main>;
}
