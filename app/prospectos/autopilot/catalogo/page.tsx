import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  answerFromCatalog, CATALOG_CHANNELS, KNOWLEDGE_TOPICS, LIMIT_ENFORCEMENT, money, previewCatalog,
  relevantKnowledge,
} from "../../../lib/axira-catalog-policy.js";
import { AXIOMAI_TENANT, listCatalog, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import SignOut from "../sign-out";
import HoloLogo from "../holo-logo";
import FuturoFx from "../futuro-fx";
import ExperienceControls from "../experience-controls";
import { systemMessage, type Dict } from "../i18n";
import { uiPrefs } from "../prefs";
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

const TAB_KEYS = ["catalogo", "conocimiento", "vista-previa", "auditoria"] as const;
type Tab = typeof TAB_KEYS[number];
const BADGE: Record<string, string> = {
  draft: "bg-slate-200 text-slate-800", approved: "bg-amber-100 text-amber-900",
  published: "bg-blue-600 text-white", archived: "bg-slate-100 text-slate-500 line-through",
};
const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" };
const channelList = (channels: string[]) => channels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ");

function groupByKey<T extends { key: string; version: number }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.key, [...(map.get(row.key) ?? []), row]);
  return [...map.entries()].map(([key, versions]) => ({ key, versions: versions.sort((a, b) => b.version - a.version) }));
}

function Badge({ status, t, opens }: { status: string; t: Dict; opens?: string }) {
  const cls = `rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[status] ?? ""}`;
  if (!opens) return <span className={cls}>{t.status[status] ?? status}</span>;
  // Abre el historial de versiones de la tarjeta (lo maneja futuro-fx.tsx).
  return <button type="button" data-open-details={opens} aria-controls={opens} title={t.versions}
    className={`${cls} cursor-pointer`}>{t.status[status] ?? status} ▾</button>;
}

function VersionActions({ entity, row, canEdit, t }: { entity: "item" | "knowledge"; row: { key: string; version: number; status: string }; canEdit: boolean; t: Dict }) {
  if (!canEdit) return null;
  const options: Array<[string, string, string]> = [];
  if (row.status === "draft") options.push(["approved", t.approve, "APROBAR"]);
  if (row.status === "approved") options.push(["published", t.publish, "PUBLICAR"]);
  if (row.status !== "archived") options.push(["archived", t.archive, "ARCHIVAR"]);
  if (row.status === "archived" || row.status === "published") options.push(["restore", t.restoreAsNew, "RESTAURAR"]);
  if (!options.length) return null;
  return <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-semibold text-blue-700">{t.changeStateOf(row.version)}</summary>
    <form action={changeVersion} className="mt-3 grid gap-2 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="version" value={row.version} />
      <label className="grid gap-1">{t.action}
        <select name="target" className="rounded border border-slate-300 bg-white p-2">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="grid gap-1">{t.confirmation}
        <input name="confirmation" required placeholder={options.map((o) => o[2]).join(" / ")} className="rounded border border-slate-300 p-2" autoComplete="off" />
      </label>
      <label className="grid gap-1">{t.reason}
        <input name="reason" required minLength={3} maxLength={300} className="rounded border border-slate-300 p-2" />
      </label>
      <button className="rounded bg-slate-950 px-4 py-2 font-semibold text-white">{t.confirm}</button>
    </form>
  </details>;
}

function FilterNote({ t, tab, view, count }: { t: Dict; tab: string; view: string; count: number }) {
  return <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
    <span>{t.showing}: <strong>{t.views[view]}</strong> ({count})</span>
    <Link href={`?tab=${tab}`} className="rounded-full bg-white px-3 py-1 font-semibold text-blue-700">{t.showAll}</Link>
  </p>;
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
  searchParams: Promise<{ tab?: string; ok?: string; error?: string; editar?: string; v?: string; q?: string; ver?: string }>;
}) {
  const { lang, mode, t, locale } = await uiPrefs();
  const date = new Intl.DateTimeFormat(locale, { timeZone: "America/Puerto_Rico", dateStyle: "medium", timeStyle: "short" });
  const priceLabel = (cents: number, period: string | null) => cents === 0 ? t.free : `${money(cents)}/${t.period[period ?? "month"]}`;
  const auth = commercialIdentityAuth(), sql = commercialIdentityDatabase();
  if (!auth || !sql) return <main className="p-8"><h1 className="text-xl font-bold">{t.accessUnavailable}</h1></main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(sql, data.user.id); }
  catch { return <main className="p-8"><h1>{t.permissionFailed}</h1></main>; }
  if (!membership) return <main className="p-8"><h1>{t.noPermission}</h1><SignOut lang={lang} /></main>;

  const params = await searchParams;
  const tab: Tab = (TAB_KEYS as readonly string[]).includes(params.tab ?? "") ? params.tab as Tab : "catalogo";
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
  const pending = [...items, ...knowledge].filter((r) => r.status === "draft" || r.status === "approved").length;
  // Filtro que abren las tarjetas del resumen: planes, servicios o pendientes.
  const view = ["planes", "servicios", "pendientes"].includes(params.ver ?? "") ? params.ver as "planes" | "servicios" | "pendientes" : null;
  const isPending = (rows: { status: string }[]) => rows.some((r) => r.status === "draft" || r.status === "approved");
  const shownItems = itemGroups.filter(({ versions }) =>
    view === "planes" ? versions[0].kind === "plan" : view === "servicios" ? versions[0].kind === "service"
      : view === "pendientes" ? isPending(versions) : true);
  const shownKnowledge = knowledgeGroups.filter(({ versions }) => view === "pendientes" ? isPending(versions) : true);
  const pendingItems = itemGroups.filter(({ versions }) => isPending(versions)).length;
  const pendingTab = pendingItems > 0 || pending === 0 ? "catalogo" : "conocimiento";
  const published = (rows: { status: string }[]) => rows.filter((r) => r.status === "published").length;
  const editItem = params.editar ? items.find((i) => i.key === params.editar && String(i.version) === params.v) : undefined;
  const editKnowledge = params.editar ? knowledge.find((k) => k.key === params.editar && String(k.version) === params.v) : undefined;
  const preview = previewCatalog({ items, knowledge });
  const question = (params.q ?? "").slice(0, 300);
  const previewAnswer = question ? answerFromCatalog(preview, { message: question, channel: "whatsapp", language: lang }) : null;
  const previewKnowledge = (question ? relevantKnowledge(preview, question) : []) as Array<{ key: string; title: string }>;
  // Las llaves vienen de la política de Axira; se muestran con el texto del idioma elegido.
  const topicKeys = Object.keys(KNOWLEDGE_TOPICS);
  const limitKeys = Object.keys(LIMIT_ENFORCEMENT);

  return <main lang={lang} data-fx-mode={mode} className="fx min-h-screen bg-slate-100 text-slate-950">
    <FuturoFx />
    <header className="bg-slate-950 px-5 py-7 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
        <HoloLogo label={t.logoLabel} />
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">AxiomOS Autopilot · {t.configuration} {isQa && "· QA"}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t.centerTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{t.centerIntro} <strong className="text-white">{t.publishedAndLive}</strong>.</p>
        </div>
        <div className="grid justify-items-start gap-3 sm:justify-items-end">
          <ExperienceControls lang={lang} mode={mode} />
          <div className="flex items-center gap-3"><Link href="/prospectos/autopilot" className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{t.back}</Link><SignOut lang={lang} /></div>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-5">
      {params.ok && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">{systemMessage(lang, params.ok)}</p>}
      {params.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">{systemMessage(lang, params.error)}</p>}
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">{t.catalogLoadError}</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t.summary}>
        {([["plans", t.plansPublished, published(items.filter((i) => i.kind === "plan")), "?tab=catalogo&ver=planes", tab === "catalogo" && view === "planes"],
          ["services", t.servicesPublished, published(items.filter((i) => i.kind === "service")), "?tab=catalogo&ver=servicios", tab === "catalogo" && view === "servicios"],
          ["knowledge", t.knowledgePublished, published(knowledge), "?tab=conocimiento", tab === "conocimiento" && !view],
          ["pending", t.pending, pending, `?tab=${pendingTab}&ver=pendientes`, view === "pendientes"]] as const).map(([id, label, value, href, current]) =>
          <Link key={id} href={href} aria-current={current ? "page" : undefined}
            className={`fx-tile block rounded-xl bg-white p-4 shadow-sm ${current ? "fx-tile-current" : ""}`}>
            <p className="text-3xl font-bold text-blue-700">{value}</p><p className="mt-1 text-xs text-slate-600">{label}</p>
            <p className="mt-2 text-xs font-semibold text-blue-700">{t.open} →</p>
          </Link>)}
      </section>

      <nav className="flex gap-2 overflow-x-auto" aria-label={t.sections}>
        {TAB_KEYS.map((key) => <Link key={key} href={`?tab=${key}`} aria-current={tab === key ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>{t.tabs[key]}</Link>)}
      </nav>
      <p className="text-sm text-slate-600">{t.role}: {membership.role === "owner" ? t.ownerCanEdit : t.readOnly}{!canEdit && membership.role === "owner" && t.writeDisabled}</p>

      {tab === "catalogo" && <>
        <section className="grid gap-4">
          {view && <FilterNote t={t} tab="catalogo" view={view} count={shownItems.length} />}
          {itemGroups.length === 0 && !loadError && <p className="rounded-xl bg-white p-5">{t.noItems}</p>}
          {shownItems.map(({ key, versions }) => {
            const current = versions.find((v) => v.status === "published") ?? versions[0];
            return <article key={key} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-lg font-bold">{current.name}</h2><p className="text-xs text-slate-500">{current.kind === "plan" ? t.plan : t.serviceKind} · {t.key} {key}{current.category && ` · ${current.category}`}</p></div>
                <Badge status={current.status} t={t} opens={`versiones-${key}`} />
              </div>
              <p className="mt-2 text-lg font-semibold text-blue-700">{current.pricing_mode === "quote" ? t.quote
                : current.promo_cents !== null ? `${money(current.promo_cents)}/${t.period[current.billing_period ?? "month"]} × ${current.promo_months} ${t.months} → ${money(current.regular_cents ?? 0)}`
                : priceLabel(current.regular_cents ?? 0, current.billing_period)}</p>
              {current.summary && <p className="mt-1 text-sm text-slate-700">{current.summary}</p>}
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {current.users_included && <li className="rounded bg-slate-100 px-2 py-1">{current.users_included} {t.users}</li>}
                {Number.isInteger(current.limits?.call_minutes) && <li className="rounded bg-slate-100 px-2 py-1">{current.limits.call_minutes} {t.callMinutes}</li>}
                {Number.isInteger(current.limits?.axira_responses) && <li className="rounded bg-slate-100 px-2 py-1">{current.limits.axira_responses} {t.axiraReplies}</li>}
                <li className="rounded bg-slate-100 px-2 py-1">{t.channelsLabel}: {channelList(current.channels)}</li>
              </ul>
              {current.benefits.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{current.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
              {current.promo_valid_until && <p className="mt-1 text-xs text-slate-600">{t.promoUntil(date.format(new Date(current.promo_valid_until)))}</p>}
              <details id={`versiones-${key}`} className="mt-3 scroll-mt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">{t.versions} ({versions.length})</summary>
                <ul className="mt-2 grid gap-3">{versions.map((v) => <li key={v.version} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><strong>v{v.version}</strong><Badge status={v.status} t={t} />
                    <span className="text-xs text-slate-500">{date.format(new Date(v.created_at))} · {v.change_reason || t.noReason}</span></div>
                  <p className="mt-1">{v.pricing_mode === "quote" ? t.quoteShort : `${v.promo_cents !== null ? `${money(v.promo_cents)} × ${v.promo_months} ${t.monthsShort} → ` : ""}${money(v.regular_cents ?? 0)}`}</p>
                  {canEdit && <Link className="mt-2 inline-block text-sm font-semibold text-blue-700" href={`?tab=catalogo&editar=${v.key}&v=${v.version}#formulario`}>{t.newVersionFrom}</Link>}
                  <VersionActions entity="item" row={v} canEdit={canEdit} t={t} />
                </li>)}</ul>
              </details>
            </article>;
          })}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-bold">{t.limitsTitle}</h2>
          <ul className="mt-1 list-disc pl-5">{limitKeys.map((k) => <li key={k}>{t.limits[k] ?? LIMIT_ENFORCEMENT[k as keyof typeof LIMIT_ENFORCEMENT]}</li>)}</ul>
          <p className="mt-1">{t.limitsNote}</p>
        </section>

        {canEdit && <section id="formulario" className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold">{editItem ? t.newVersionOf(editItem.name) : t.newItem}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.draftFlow}</p>
          <form action={saveItemDraft} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t.uniqueKey} hint={t.keyHint}><input name="key" required defaultValue={editItem?.key} readOnly={Boolean(editItem)} className={input} /></Field>
            <Field label={t.name}><input name="name" required minLength={3} maxLength={80} defaultValue={editItem?.name} className={input} /></Field>
            <Field label={t.type}><select name="kind" defaultValue={editItem?.kind ?? "plan"} className={input}><option value="plan">{t.plan}</option><option value="service">{t.serviceKind}</option></select></Field>
            <Field label={t.category}><input name="category" maxLength={60} defaultValue={editItem?.category} className={input} /></Field>
            <Field label={t.description}><textarea name="summary" maxLength={400} rows={2} defaultValue={editItem?.summary} className={input} /></Field>
            <Field label={t.price}><select name="pricingMode" defaultValue={editItem?.pricing_mode ?? "fixed"} className={input}><option value="fixed">{t.fixedPrice}</option><option value="quote">{t.quote}</option></select></Field>
            <Field label={t.regularUsd} hint={t.emptyIfQuote}><input name="regular" inputMode="decimal" defaultValue={editItem?.regular_cents != null ? (editItem.regular_cents / 100).toFixed(2) : ""} className={input} /></Field>
            <Field label={t.periodicity}><select name="billingPeriod" defaultValue={editItem?.billing_period ?? "month"} className={input}><option value="month">{t.monthly}</option><option value="year">{t.yearly}</option><option value="one_time">{t.oneTime}</option></select></Field>
            <Field label={t.promoUsd} hint={t.optional}><input name="promo" inputMode="decimal" defaultValue={editItem?.promo_cents != null ? (editItem.promo_cents / 100).toFixed(2) : ""} className={input} /></Field>
            <Field label={t.promoMonths}><input name="promoMonths" inputMode="numeric" defaultValue={editItem?.promo_months ?? ""} className={input} /></Field>
            <Field label={t.promoAvailableUntil} hint={t.promoUntilHint}><input type="datetime-local" name="promoValidUntil" defaultValue={toLocal(editItem?.promo_valid_until)} className={input} /></Field>
            <Field label={t.usersIncluded}><input name="usersIncluded" inputMode="numeric" defaultValue={editItem?.users_included ?? ""} className={input} /></Field>
            <Field label={t.minutesIncluded}><input name="callMinutes" inputMode="numeric" defaultValue={editItem?.limits?.call_minutes ?? ""} className={input} /></Field>
            <Field label={t.repliesMonth}><input name="axiraResponses" inputMode="numeric" defaultValue={editItem?.limits?.axira_responses ?? ""} className={input} /></Field>
            <Field label={t.benefits} hint={t.onePerLine}><textarea name="benefits" rows={4} defaultValue={editItem?.benefits.join("\n")} className={input} /></Field>
            <Field label={t.restrictions} hint={t.onePerLineF}><textarea name="restrictions" rows={4} defaultValue={editItem?.restrictions.join("\n")} className={input} /></Field>
            <Field label={t.validFrom} hint={t.emptyNow}><input type="datetime-local" name="validFrom" className={input} /></Field>
            <Field label={t.validUntil} hint={t.optional}><input type="datetime-local" name="validUntil" defaultValue={toLocal(editItem?.valid_until)} className={input} /></Field>
            <fieldset className="grid gap-2 text-sm sm:col-span-2"><legend className="font-medium">{t.channelsWhere}</legend>
              <div className="flex flex-wrap gap-4">{CATALOG_CHANNELS.map((c: string) => <label key={c} className="flex items-center gap-2"><input type="checkbox" name="channels" value={c} defaultChecked={!editItem || editItem.channels.includes(c)} />{CHANNEL_LABELS[c] ?? c}</label>)}</div>
            </fieldset>
            <Field label={t.auditReason}><input name="reason" required minLength={3} maxLength={300} className={input} /></Field>
            <div className="sm:col-span-2"><button className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white sm:w-auto">{t.saveDraft}</button></div>
          </form>
        </section>}
      </>}

      {tab === "conocimiento" && <>
        <section className="grid gap-4">
          {view === "pendientes" && <FilterNote t={t} tab="conocimiento" view={view} count={shownKnowledge.length} />}
          {knowledgeGroups.length === 0 && !loadError && <p className="rounded-xl bg-white p-5">{t.noKnowledge}</p>}
          {shownKnowledge.map(({ key, versions }) => {
            const current = versions.find((v) => v.status === "published") ?? versions[0];
            return <article key={key} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="font-bold">{current.title}</h2><p className="text-xs text-slate-500">{t.topics[current.topic] ?? current.topic} · {current.language.toUpperCase()} · {t.key} {key}</p></div>
                <Badge status={current.status} t={t} opens={`versiones-${key}`} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{current.answer}</p>
              {current.keywords.length > 0 && <p className="mt-2 text-xs text-slate-500">{t.keywords}: {current.keywords.join(", ")}</p>}
              <details id={`versiones-${key}`} className="mt-3 scroll-mt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">{t.versions} ({versions.length})</summary>
                <ul className="mt-2 grid gap-3">{versions.map((v) => <li key={v.version} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><strong>v{v.version}</strong><Badge status={v.status} t={t} /><span className="text-xs text-slate-500">{date.format(new Date(v.created_at))} · {v.change_reason || t.noReason}</span></div>
                  {canEdit && <Link className="mt-2 inline-block text-sm font-semibold text-blue-700" href={`?tab=conocimiento&editar=${v.key}&v=${v.version}#formulario`}>{t.newVersionFrom}</Link>}
                  <VersionActions entity="knowledge" row={v} canEdit={canEdit} t={t} />
                </li>)}</ul>
              </details>
            </article>;
          })}
        </section>
        {canEdit && <section id="formulario" className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold">{editKnowledge ? t.newVersionOf(editKnowledge.title) : t.newKnowledge}</h2>
          <form action={saveKnowledgeDraft} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t.uniqueKey}><input name="key" required defaultValue={editKnowledge?.key} readOnly={Boolean(editKnowledge)} className={input} /></Field>
            <Field label={t.topic}><select name="topic" defaultValue={editKnowledge?.topic ?? "faq"} className={input}>{topicKeys.map((v) => <option key={v} value={v}>{t.topics[v] ?? v}</option>)}</select></Field>
            <Field label={t.lang}><select name="language" defaultValue={editKnowledge?.language ?? "es"} className={input}><option value="es">{t.spanish}</option><option value="en">{t.english}</option></select></Field>
            <Field label={t.titleOrQuestion}><input name="title" required minLength={3} maxLength={160} defaultValue={editKnowledge?.title} className={input} /></Field>
            <div className="sm:col-span-2"><Field label={t.approvedAnswer}><textarea name="answer" required minLength={3} maxLength={1500} rows={5} defaultValue={editKnowledge?.answer} className={input} /></Field></div>
            <Field label={t.keywords} hint={t.commaSeparated}><input name="keywords" defaultValue={editKnowledge?.keywords.join(", ")} className={input} /></Field>
            <Field label={t.validUntil} hint={t.optional}><input type="datetime-local" name="validUntil" defaultValue={toLocal(editKnowledge?.valid_until)} className={input} /></Field>
            <Field label={t.auditReason}><input name="reason" required minLength={3} maxLength={300} className={input} /></Field>
            <div className="sm:col-span-2"><button className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white sm:w-auto">{t.saveDraft}</button></div>
          </form>
        </section>}
      </>}

      {tab === "vista-previa" && <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold">{t.previewTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.previewIntro1} <strong>{t.previewIntro2}</strong> {t.previewIntro3}</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="tab" value="vista-previa" />
          <input name="q" defaultValue={question} placeholder={t.previewPlaceholder} className={`${input} flex-1`} />
          <button className="rounded-lg bg-slate-950 px-5 py-2.5 font-semibold text-white">{t.test}</button>
        </form>
        {question && <div className="mt-4 grid gap-3">
          <div className="rounded-xl bg-slate-100 p-3 text-sm"><span className="font-semibold">{t.client}</span> {question}</div>
          <div className="rounded-xl bg-blue-600 p-3 text-sm text-white"><span className="font-semibold">Axira:</span> {previewAnswer
            ? previewAnswer.reply : t.notPriceQuestion}</div>
          {previewKnowledge.length > 0 && <div className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-semibold">{t.contextReceived}</p>
            <ul className="mt-1 list-disc pl-5">{previewKnowledge.map((k) => <li key={k.key}>{k.title}</li>)}</ul></div>}
        </div>}
      </section>}

      {tab === "auditoria" && <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold">{t.historyTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.historyIntro}</p>
        <ul className="mt-4 grid gap-2">{audit.map((a) => <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><strong>{t.actions[a.action] ?? a.action}</strong><span className="text-slate-600">{a.entity === "item" ? t.catalogEntity : t.knowledgeEntity} · {a.entity_key} v{a.version}</span>
            <span className="text-xs text-slate-500">{a.from_status ? `${t.status[a.from_status] ?? a.from_status} → ` : ""}{t.status[a.to_status] ?? a.to_status}</span></div>
          <p className="mt-1 text-xs text-slate-500">{date.format(new Date(a.recorded_at))} · {a.actor} · {a.reason || t.noReason}</p>
        </li>)}</ul>
      </section>}
    </div>
  </main>;
}
