"use client";
// Recorrido interactivo de AxiomOS Autopilot con datos de demostración.
// Todo ocurre en el navegador: no envía mensajes, no hace llamadas y no escribe en la base de datos.
// Las respuestas de precios de Axira sí usan el catálogo real publicado (lo pasa la página del servidor).
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { answerFromCatalog, relevantKnowledge, wantsHuman } from "../../../lib/axira-catalog-policy.js";
import type { Lang } from "../i18n";
import {
  CALLS, CONVERSATIONS, FOLLOWUPS, PROSPECTS, STAGES, demoText, pick,
  type DemoConversation, type DemoFollowup, type DemoProspect, type Stage,
} from "./demo-data";

type Catalog = { items: unknown[]; knowledge: unknown[] };
const SECTIONS = ["inicio", "conversaciones", "prospectos", "seguimientos", "llamadas", "campanas", "panel", "actividad"] as const;
type Section = typeof SECTIONS[number];
const TOUR: Section[] = ["conversaciones", "prospectos", "seguimientos", "llamadas", "campanas", "panel"];

type Thread = DemoConversation & { transferred?: boolean; extra: Array<{ from: "agent" | "axira"; text: string }> };

function initialState() {
  return {
    prospects: PROSPECTS.map((p) => ({ ...p })),
    threads: CONVERSATIONS.map((c) => ({ ...c, extra: [] })) as Thread[],
    followups: FOLLOWUPS.map((f) => ({ ...f })),
    campaigns: [] as Array<{ name: string; recipients: number }>,
    log: [] as string[],
  };
}

export default function DemoTour({ lang, catalog }: { lang: Lang; catalog: Catalog }) {
  const t = demoText(lang);
  const [section, setSection] = useState<Section>("inicio");
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<string>(CONVERSATIONS[0].prospectId);

  // Sincroniza la sección con el ancla de la dirección (#conversaciones, etc.).
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as Section;
      if ((SECTIONS as readonly string[]).includes(h)) setSection(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (s: Section) => {
    setSection(s);
    history.replaceState(null, "", `#${s}`);
    document.getElementById("demo-top")?.scrollIntoView({ block: "start" });
  };
  const log = (line: string) => setState((st) => ({ ...st, log: [line, ...st.log].slice(0, 40) }));
  const prospect = (id: string) => state.prospects.find((p) => p.id === id)!;

  const tourIndex = TOUR.indexOf(section);
  const unread = state.threads.reduce((n, th) => n + th.unread, 0);
  const overdue = state.followups.filter((f) => !f.done && f.dueInHours < 0).length;

  return <div id="demo-top" className="grid gap-5 scroll-mt-4">
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-xs font-bold tracking-widest">{t.badge}</p>
      <p className="mt-1 text-sm">{t.intro} {t.realPrices}</p>
    </section>

    <nav aria-label={t.title} className="flex gap-2 overflow-x-auto">
      {SECTIONS.map((s) => <button key={s} type="button" aria-current={section === s ? "page" : undefined} onClick={() => go(s)}
        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${section === s ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>
        {t.sections[s]}{s === "conversaciones" && unread > 0 ? ` · ${unread}` : ""}{s === "seguimientos" && overdue > 0 ? ` · ${overdue}!` : ""}
      </button>)}
    </nav>

    {tourIndex >= 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
      <span><strong>{t.step} {tourIndex + 1}/{TOUR.length}:</strong> {t.tour[tourIndex][1]}</span>
      <span className="flex gap-2">
        {tourIndex > 0 && <button type="button" className="rounded-lg px-3 py-1.5" onClick={() => go(TOUR[tourIndex - 1])}>{t.prev}</button>}
        {tourIndex < TOUR.length - 1 && <button type="button" className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white" onClick={() => go(TOUR[tourIndex + 1])}>{t.next}</button>}
      </span>
    </div>}

    {section === "inicio" && <Start t={t} go={go} />}
    {section === "conversaciones" && <Conversations t={t} lang={lang} catalog={catalog} state={state} setState={setState}
      selected={selected} setSelected={setSelected} prospect={prospect} log={log} />}
    {section === "prospectos" && <Prospects t={t} lang={lang} state={state} setState={setState} log={log} />}
    {section === "seguimientos" && <Followups t={t} lang={lang} state={state} setState={setState} prospect={prospect} log={log} />}
    {section === "llamadas" && <Calls t={t} lang={lang} prospect={prospect} />}
    {section === "campanas" && <Campaigns t={t} state={state} setState={setState} log={log} />}
    {section === "panel" && <Dashboard t={t} state={state} unread={unread} overdue={overdue} />}
    {section === "actividad" && <Activity t={t} state={state} />}

    <div className="flex justify-end">
      <button type="button" className="rounded-lg px-4 py-2 text-sm" onClick={() => { setState(initialState()); setSelected(CONVERSATIONS[0].prospectId); log(t.log.reset); }}>{t.reset}</button>
    </div>
  </div>;
}

type T = ReturnType<typeof demoText>;
type St = ReturnType<typeof initialState>;
type SetSt = Dispatch<SetStateAction<St>>;

function Start({ t, go }: { t: T; go: (s: Section) => void }) {
  return <section className="grid gap-4">
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">{t.title}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {t.tour.map(([title, text], i) => <li key={title} className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-blue-700">{t.step} {i + 1}</p>
          <h3 className="mt-1 font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{text}</p>
          <button type="button" className="mt-3 rounded-lg px-3 py-1.5 text-sm" onClick={() => go(TOUR[i])}>{t.go} →</button>
        </li>)}
      </ol>
      <button type="button" className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white" onClick={() => go(TOUR[0])}>{t.startTour}</button>
    </div>
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">{t.statusTitle}</h2>
      <ul className="mt-3 grid gap-2 text-sm">
        {t.status.map(([label, ok]) => <li key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
          <span>{label}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ok ? "bg-green-100 text-green-950" : "bg-amber-100 text-amber-900"}`}>{ok ? t.connected : t.integration}</span>
        </li>)}
      </ul>
    </div>
  </section>;
}

function suggestion(catalog: Catalog, lang: Lang, message: string, t: T) {
  const fromCatalog = answerFromCatalog(catalog, { message, language: lang, channel: "whatsapp" }) as { reply: string } | null;
  if (fromCatalog) return { text: fromCatalog.reply, source: t.suggestionFromCatalog, handoff: false };
  if (wantsHuman(message)) return { text: t.handoffReply, source: t.suggestionHandoff, handoff: true };
  const k = relevantKnowledge(catalog, message, { language: lang }) as Array<{ answer: string }>;
  if (k.length) return { text: k[0].answer, source: t.suggestionFromKnowledge, handoff: false };
  return { text: t.handoffReply, source: t.noSuggestion, handoff: true };
}

function Conversations({ t, lang, catalog, state, setState, selected, setSelected, prospect, log }: {
  t: T; lang: Lang; catalog: Catalog; state: St; setState: SetSt; selected: string; setSelected: (id: string) => void;
  prospect: (id: string) => DemoProspect; log: (l: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const thread = state.threads.find((th) => th.prospectId === selected)!;
  const p = prospect(selected);
  const lastClient = [...thread.messages].reverse().find((m) => m.from === "client");
  const sug = useMemo(() => suggestion(catalog, lang, lastClient ? pick(lastClient.text, lang) : "", t), [catalog, lang, lastClient, t]);
  const answered = thread.extra.length > 0 || thread.messages[thread.messages.length - 1]?.from !== "client";

  const add = (from: "agent" | "axira", text: string) => setState((st) => ({
    ...st, threads: st.threads.map((th) => th.prospectId === selected ? { ...th, unread: 0, extra: [...th.extra, { from, text }] } : th),
  }));
  const open = (id: string) => {
    setSelected(id);
    setState((st) => ({ ...st, threads: st.threads.map((th) => th.prospectId === id ? { ...th, unread: 0 } : th) }));
  };

  return <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">{t.inbox}</h2>
      <ul className="mt-3 grid gap-2">
        {state.threads.map((th) => { const pr = prospect(th.prospectId); const last = th.extra.at(-1)?.text ?? pick(th.messages.at(-1)!.text, lang);
          return <li key={th.prospectId}><button type="button" onClick={() => open(th.prospectId)} aria-current={th.prospectId === selected ? "true" : undefined}
            className={`w-full rounded-xl p-3 text-left text-sm ${th.prospectId === selected ? "bg-blue-50" : ""}`}>
            <span className="flex items-center justify-between gap-2"><strong>{pr.name}</strong><span className="text-xs text-slate-500">{t.channels[pr.channel]}</span></span>
            <span className="mt-1 block truncate text-slate-600">{last}</span>
            {th.unread > 0 && <span className="mt-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{th.unread} {t.unread}</span>}
            {th.transferred && <span className="mt-1 ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{t.transferred}</span>}
          </button></li>; })}
      </ul>
    </div>
    <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-bold">{p.name}</h2><p className="text-xs text-slate-500">{pick(p.business, lang)} · {t.channels[p.channel]} · ***{p.phoneLast4}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.consent ? "bg-green-100 text-green-950" : "bg-red-100 text-red-900"}`}>{p.consent ? t.consentYes : t.consentNo}</span>
      </div>
      <ul className="grid gap-2">
        {thread.messages.map((m, i) => <Bubble key={i} who={m.from} text={pick(m.text, lang)} t={t} />)}
        {thread.extra.map((m, i) => <Bubble key={`x${i}`} who={m.from} text={m.text} t={t} note={t.notSent} />)}
      </ul>
      {!answered && !thread.transferred && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
        <p className="text-xs font-bold text-blue-700">{t.axiraSuggests} · {sug.source}</p>
        <p className="mt-1 text-blue-900">{sug.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white" onClick={() => { add("axira", sug.text); log(t.log.sent(p.name)); }}>{t.approveSend}</button>
          <button type="button" className="rounded-lg px-3 py-2" onClick={() => {
            setState((st) => ({ ...st, threads: st.threads.map((th) => th.prospectId === selected ? { ...th, transferred: true, unread: 0 } : th) }));
            log(t.log.transferred(p.name));
          }}>{t.transfer}</button>
        </div>
      </div>}
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; add("agent", draft.trim()); log(t.log.sent(p.name)); setDraft(""); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.writeReply} className="flex-1 rounded-lg border p-2.5" maxLength={500} />
        <button className="rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white">{t.sendOwn}</button>
      </form>
    </div>
  </section>;
}

function Bubble({ who, text, t, note }: { who: "client" | "axira" | "agent"; text: string; t: T; note?: string }) {
  const mine = who !== "client";
  return <li className={`max-w-[85%] rounded-xl p-3 text-sm ${mine ? "ml-auto bg-blue-600 text-white" : "bg-slate-100"}`}>
    <p className="text-xs font-bold opacity-80">{who === "client" ? t.client : who === "axira" ? "Axira" : t.you}</p>
    <p className="mt-0.5">{text}</p>
    {note && <p className="mt-1 text-xs italic opacity-80">{note}</p>}
  </li>;
}

function Prospects({ t, lang, state, setState, log }: { t: T; lang: Lang; state: St; setState: SetSt; log: (l: string) => void }) {
  const move = (p: DemoProspect, dir: -1 | 1) => {
    const next = STAGES[STAGES.indexOf(p.stage) + dir];
    if (!next) return;
    setState((st) => ({ ...st, prospects: st.prospects.map((x) => x.id === p.id ? { ...x, stage: next } : x) }));
    log(t.log.moved(p.name, t.stages[next]));
  };
  return <section className="grid gap-3 lg:grid-cols-5">
    {STAGES.map((stage: Stage) => { const list = state.prospects.filter((p) => p.stage === stage);
      return <div key={stage} className="rounded-2xl bg-white p-3 shadow-sm">
        <h2 className="flex items-center justify-between font-bold">{t.stages[stage]}<span className="rounded-full bg-slate-100 px-2 text-xs">{list.length}</span></h2>
        <ul className="mt-3 grid gap-2">
          {list.map((p) => <li key={p.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs text-slate-500">{pick(p.business, lang)} · {t.channels[p.channel]}</p>
            <p className="mt-1 text-xs">{pick(p.note, lang)}</p>
            <p className="mt-1 text-xs text-slate-500">{t.owner}: {p.owner ?? t.unassigned}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {STAGES.indexOf(stage) > 0 && <button type="button" className="rounded-lg px-2 py-1 text-xs" onClick={() => move(p, -1)}>{t.moveBack}</button>}
              {STAGES.indexOf(stage) < STAGES.length - 1 && <button type="button" className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => move(p, 1)}>{t.moveNext}</button>}
              {!p.owner && <button type="button" className="rounded-lg px-2 py-1 text-xs" onClick={() => {
                setState((st) => ({ ...st, prospects: st.prospects.map((x) => x.id === p.id ? { ...x, owner: t.you } : x) })); log(t.log.assigned(p.name));
              }}>{t.assignMe}</button>}
            </div>
          </li>)}
        </ul>
      </div>; })}
  </section>;
}

function Followups({ t, lang, state, setState, prospect, log }: {
  t: T; lang: Lang; state: St; setState: SetSt; prospect: (id: string) => DemoProspect; log: (l: string) => void;
}) {
  const update = (f: DemoFollowup, patch: Partial<DemoFollowup>) =>
    setState((st) => ({ ...st, followups: st.followups.map((x) => x.id === f.id ? { ...x, ...patch } : x) }));
  const sorted = [...state.followups].sort((a, b) => Number(a.done) - Number(b.done) || a.dueInHours - b.dueInHours);
  return <section className="rounded-2xl bg-white p-4 shadow-sm">
    <h2 className="font-bold">{t.sections.seguimientos} · {state.followups.filter((f) => !f.done).length} {t.pendingFollowups} · {state.followups.filter((f) => !f.done && f.dueInHours < 0).length} {t.overdueCount}</h2>
    <ul className="mt-3 grid gap-2">
      {sorted.map((f) => { const p = prospect(f.prospectId); const late = !f.done && f.dueInHours < 0;
        return <li key={f.id} className={`rounded-xl border p-3 text-sm ${late ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={f.done ? "line-through opacity-70" : "font-semibold"}>{pick(f.task, lang)}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${f.done ? "bg-green-100 text-green-950" : late ? "bg-red-100 text-red-900" : "bg-slate-100"}`}>
              {f.done ? t.done : late ? `${t.overdue} · ${t.agoHours(f.dueInHours)}` : `${t.due} ${t.inHours(f.dueInHours)}`}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{p.name} · {pick(p.business, lang)}</p>
          {!f.done && <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => { update(f, { done: true }); log(t.log.done(pick(f.task, lang))); }}>{t.markDone}</button>
            <button type="button" className="rounded-lg px-3 py-1.5 text-xs" onClick={() => { update(f, { dueInHours: Math.max(f.dueInHours, 0) + 24 }); log(t.log.postponed(pick(f.task, lang))); }}>{t.postpone}</button>
          </div>}
        </li>; })}
    </ul>
  </section>;
}

function Calls({ t, lang, prospect }: { t: T; lang: Lang; prospect: (id: string) => DemoProspect }) {
  const used = CALLS.reduce((n, c) => n + c.minutes, 0);
  return <section className="grid gap-4">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{t.minutesUsed}</p>
      <p className="text-3xl font-bold text-blue-700">{used} <span className="text-base font-normal text-slate-600">{t.ofPlan}</span></p>
      <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, (used / 200) * 100)}%` }} /></div>
      <p className="mt-2 text-xs text-slate-500">{t.callNote}</p>
    </div>
    <ul className="grid gap-2">
      {CALLS.map((c) => { const p = prospect(c.prospectId);
        return <li key={c.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{p.name}</strong>
            <span className="text-xs text-slate-500">{c.direction === "in" ? t.callIn : t.callOut} · {c.minutes} {t.min} · {c.at}</span></div>
          <p className="mt-1"><span className="text-xs font-bold text-blue-700">Axira · </span>{pick(c.summary, lang)}</p>
        </li>; })}
    </ul>
  </section>;
}

function Campaigns({ t, state, setState, log }: { t: T; state: St; setState: SetSt; log: (l: string) => void }) {
  const [name, setName] = useState(t.defaultCampaign);
  const [msg, setMsg] = useState(t.defaultCampaignMsg);
  const [segment, setSegment] = useState<"all" | Stage>("all");
  const [saved, setSaved] = useState(false);
  const pool = state.prospects.filter((p) => p.stage !== "perdido" && (segment === "all" || p.stage === segment));
  const recipients = pool.filter((p) => p.consent);
  const excluded = pool.length - recipients.length;
  return <section className="grid gap-4 lg:grid-cols-2">
    <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm" onSubmit={(e) => {
      e.preventDefault();
      setState((st) => ({ ...st, campaigns: [...st.campaigns, { name, recipients: recipients.length }] }));
      log(t.log.campaign(name, recipients.length)); setSaved(true);
    }}>
      <label className="grid gap-1 text-sm">{t.campaignName}<input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={80} className="rounded-lg border p-2.5" required /></label>
      <label className="grid gap-1 text-sm">{t.campaignMsg}<textarea value={msg} onChange={(e) => { setMsg(e.target.value); setSaved(false); }} maxLength={500} rows={4} className="rounded-lg border p-2.5" required /></label>
      <label className="grid gap-1 text-sm">{t.segment}
        <select value={segment} onChange={(e) => { setSegment(e.target.value as "all" | Stage); setSaved(false); }} className="rounded-lg border p-2.5">
          <option value="all">{t.segmentAll}</option>
          {STAGES.filter((s) => s !== "perdido").map((s) => <option key={s} value={s}>{t.segmentStage}: {t.stages[s]}</option>)}
        </select></label>
      <p className="text-sm"><strong>{recipients.length}</strong> {t.recipients}{excluded > 0 && <> · <strong>{excluded}</strong> {t.excludedOptOut}</>}</p>
      <button className="w-fit rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white" disabled={recipients.length === 0}>{t.schedule}</button>
      {saved && <p role="status" className="rounded-lg bg-green-100 p-3 text-sm text-green-950">{t.scheduled}</p>}
      <p className="text-xs text-slate-500">{t.campaignNote}</p>
    </form>
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <ul className="grid gap-2 text-sm">
        {recipients.slice(0, 4).map((p) => <li key={p.id} className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs font-bold">{p.name}</p><p className="mt-1">{msg.replaceAll("{nombre}", p.name.split(" ")[0])}</p></li>)}
      </ul>
    </div>
  </section>;
}

function Dashboard({ t, state, unread, overdue }: { t: T; state: St; unread: number; overdue: number }) {
  const active = state.prospects.filter((p) => p.stage !== "perdido");
  const clients = state.prospects.filter((p) => p.stage === "cliente");
  const conversion = state.prospects.length ? Math.round((clients.length / state.prospects.length) * 100) : 0;
  const monthly = clients.reduce((n, p) => n + p.value, 0);
  const max = Math.max(1, ...STAGES.map((s) => state.prospects.filter((p) => p.stage === s).length));
  return <section className="grid gap-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {([[t.kpiProspects, active.length], [t.kpiClients, clients.length], [t.kpiConversion, `${conversion}%`],
        [t.kpiMonthly, `$${monthly.toFixed(2)}`], [t.kpiOverdue, overdue], [t.kpiUnread, unread]] as const).map(([label, value]) =>
        <div key={label} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
    </div>
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">{t.byStage}</h2>
      <ul className="mt-3 grid gap-2 text-sm">
        {STAGES.map((s) => { const n = state.prospects.filter((p) => p.stage === s).length;
          return <li key={s} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2"><span>{t.stages[s]}</span>
            <span className="h-3 rounded-full bg-slate-100"><span className="block h-3 rounded-full bg-blue-600" style={{ width: `${(n / max) * 100}%` }} /></span><span className="text-right">{n}</span></li>; })}
      </ul>
    </div>
  </section>;
}

function Activity({ t, state }: { t: T; state: St }) {
  return <section className="rounded-2xl bg-white p-4 shadow-sm">
    <h2 className="font-bold">{t.sections.actividad}</h2>
    {state.log.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t.activityEmpty}</p>
      : <ol className="mt-3 grid gap-2 text-sm">{state.log.map((l, i) => <li key={i} className="rounded-lg border border-slate-200 p-2">{l}</li>)}</ol>}
  </section>;
}
