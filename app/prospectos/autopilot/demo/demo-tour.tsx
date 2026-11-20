"use client";
// Recorrido interactivo de AxiomOS Autopilot con datos de demostración.
// Todo ocurre en el navegador: no envía mensajes, no hace llamadas y no escribe en la base de datos.
// Las respuestas de precios de Axira sí usan el catálogo real publicado (lo pasa la página del servidor).
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { answerFromCatalog, money, relevantKnowledge, wantsHuman } from "../../../lib/axira-catalog-policy.js";
import { analyzeConversation, answerBrain, brainAllowance } from "../../../lib/axiomos-brain.js";
import type { Lang } from "../i18n";
import {
  CALLS, CLIENT_REPLIES, CONVERSATIONS, FOLLOWUPS, PROSPECTS, STAGES, demoText, pick,
  type DemoCall, type DemoConversation, type DemoFollowup, type DemoProspect, type Stage,
} from "./demo-data";

type Catalog = { status?: string; items: unknown[]; knowledge: unknown[] };
const SECTIONS = ["inicio", "conversaciones", "prospectos", "seguimientos", "llamadas", "campanas", "panel", "brain", "actividad"] as const;
type Section = typeof SECTIONS[number];
const TOUR: Section[] = ["conversaciones", "prospectos", "seguimientos", "llamadas", "campanas", "panel", "brain"];

type Extra = { from: "agent" | "axira" | "client" | "system"; text: string };
type Thread = DemoConversation & { transferred?: boolean; extra: Extra[]; replies: number };

function initialState() {
  // Cada contacto tiene su conversación (vacía si no trae mensajes de ejemplo).
  const threads: Thread[] = PROSPECTS.map((p) => {
    const c = CONVERSATIONS.find((x) => x.prospectId === p.id);
    return { prospectId: p.id, unread: c?.unread ?? 0, messages: c?.messages ?? [], extra: [], replies: 0 };
  });
  return {
    prospects: PROSPECTS.map((p) => ({ ...p })),
    threads,
    followups: FOLLOWUPS.map((f) => ({ ...f })),
    calls: CALLS.map((c) => ({ ...c })) as DemoCall[],
    notes: {} as Record<string, string[]>,
    campaigns: [] as Array<{ name: string; recipients: number }>,
    log: [] as string[],
  };
}

export default function DemoTour({ lang, catalog }: { lang: Lang; catalog: Catalog }) {
  const t = demoText(lang);
  const [section, setSection] = useState<Section>("inicio");
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<string>(CONVERSATIONS[0].prospectId);
  const [opened, setOpened] = useState(false);
  const [calling, setCalling] = useState<string | null>(null); // contacto en llamada simulada

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
  // Tocar un contacto en cualquier sección abre su conversación.
  const openContact = (id: string) => {
    setSelected(id);
    setOpened(true);
    setState((st) => ({ ...st, threads: st.threads.map((th) => th.prospectId === id ? { ...th, unread: 0 } : th) }));
    go("conversaciones");
  };

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
        className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${section === s ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>
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
      selected={selected} opened={opened} setOpened={setOpened} openContact={openContact} prospect={prospect} log={log} startCall={setCalling} />}
    {section === "prospectos" && <Prospects t={t} lang={lang} state={state} setState={setState} log={log} openContact={openContact} />}
    {section === "seguimientos" && <Followups t={t} lang={lang} state={state} setState={setState} prospect={prospect} log={log} openContact={openContact} />}
    {section === "llamadas" && <Calls t={t} lang={lang} state={state} prospect={prospect} openContact={openContact} startCall={setCalling} />}
    {calling && <CallScreen t={t} lang={lang} p={prospect(calling)} setState={setState} log={log} close={() => setCalling(null)} />}
    {section === "campanas" && <Campaigns t={t} state={state} setState={setState} log={log} />}
    {section === "panel" && <Dashboard t={t} state={state} unread={unread} overdue={overdue} />}
    {section === "brain" && <BrainDemo t={t} lang={lang} catalog={catalog} state={state} overdue={overdue} log={log} />}
    {section === "actividad" && <Activity t={t} state={state} />}

    <div className="flex justify-end">
      <button type="button" className="rounded-lg px-4 py-2 text-sm" onClick={() => { setState(initialState()); setSelected(CONVERSATIONS[0].prospectId); setOpened(false); log(t.log.reset); }}>{t.reset}</button>
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

function Conversations({ t, lang, catalog, state, setState, selected, opened, setOpened, openContact, prospect, log, startCall }: {
  t: T; lang: Lang; catalog: Catalog; state: St; setState: SetSt; selected: string; opened: boolean; setOpened: (v: boolean) => void;
  openContact: (id: string) => void; prospect: (id: string) => DemoProspect; log: (l: string) => void; startCall: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [adviceFor, setAdvice] = useState<{ id: string; data: ReturnType<typeof analyzeConversation> } | null>(null);
  const advice = adviceFor?.id === selected ? adviceFor.data : null; // al cambiar de contacto no se muestra el consejo anterior
  const [typing, setTyping] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const thread = state.threads.find((th) => th.prospectId === selected)!;
  const p = prospect(selected);
  const all: Extra[] = [...thread.messages.map((m) => ({ from: m.from, text: pick(m.text, lang) })), ...thread.extra];
  const lastClientText = [...all].reverse().find((m) => m.from === "client")?.text ?? "";
  const sug = suggestion(catalog, lang, lastClientText, t);
  const lastReal = [...all].reverse().find((m) => m.from !== "system");
  const waiting = lastReal?.from === "client";
  const priceReply = suggestion(catalog, lang, lang === "en" ? "How much is AxiomOS Basic?" : "¿Cuánto cuesta AxiomOS Básico?", t).text;

  const push = (id: string, item: Extra, patch: Partial<Thread> = {}) => setState((st) => ({
    ...st, threads: st.threads.map((th) => th.prospectId === id ? { ...th, ...patch, unread: 0, extra: [...th.extra, item] } : th),
  }));
  // Después de responder, el cliente ficticio "escribe" y contesta con la siguiente línea de su guion.
  const clientAnswers = (id: string) => {
    const th = state.threads.find((x) => x.prospectId === id)!;
    const next = CLIENT_REPLIES[id]?.[th.replies];
    if (!next || th.transferred) return;
    const who = prospect(id).name.split(" ")[0];
    timers.current.push(window.setTimeout(() => setTyping(who), 700));
    timers.current.push(window.setTimeout(() => {
      setTyping(null);
      setState((st) => ({ ...st, threads: st.threads.map((x) => x.prospectId === id
        ? { ...x, replies: x.replies + 1, extra: [...x.extra, { from: "client", text: pick(next, lang) }] } : x) }));
    }, 2300));
  };
  const reply = (from: "agent" | "axira", text: string) => {
    if (!text.trim()) return;
    push(selected, { from, text: text.trim() });
    log(t.log.sent(p.name));
    setDraft("");
    clientAnswers(selected);
  };
  const system = (text: string) => push(selected, { from: "system", text });
  const updateProspect = (patch: Partial<DemoProspect>) =>
    setState((st) => ({ ...st, prospects: st.prospects.map((x) => x.id === p.id ? { ...x, ...patch } : x) }));

  const followup = () => {
    setState((st) => ({ ...st, followups: [...st.followups, { id: `f${Date.now()}`, prospectId: p.id, dueInHours: 24,
      task: { es: t.followupTask, en: t.followupTask }, done: false }] }));
    system(t.sysFollowup); log(t.log.followup(p.name));
  };
  const nextStage = () => {
    const next = STAGES[STAGES.indexOf(p.stage) + 1];
    if (!next) return;
    updateProspect({ stage: next }); system(t.sysStage(t.stages[next])); log(t.log.moved(p.name, t.stages[next]));
  };
  const transfer = () => {
    push(selected, { from: "system", text: t.sysTransfer }, { transferred: true });
    log(t.log.transferred(p.name));
  };
  const toggleConsent = () => {
    updateProspect({ consent: !p.consent });
    system(p.consent ? t.sysOptOut : t.sysOptIn); log(p.consent ? t.log.optOut(p.name) : t.log.optIn(p.name));
  };
  const saveNote = () => {
    if (!note.trim()) return;
    setState((st) => ({ ...st, notes: { ...st.notes, [p.id]: [note.trim(), ...(st.notes[p.id] ?? [])] } }));
    log(t.log.note(p.name)); setNote("");
  };
  const myFollowups = state.followups.filter((f) => f.prospectId === p.id);
  const myCalls = state.calls.filter((c) => c.prospectId === p.id);
  const chip = "shrink-0 whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700";

  return <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${opened ? "hidden lg:block" : ""}`}>
      <h2 className="font-bold">{t.inbox}</h2>
      <ul className="mt-3 grid gap-2">
        {state.threads.map((th) => { const pr = prospect(th.prospectId);
          const lastItem = th.extra.at(-1)?.text ?? (th.messages.length ? pick(th.messages.at(-1)!.text, lang) : t.none);
          return <li key={th.prospectId}><button type="button" onClick={() => openContact(th.prospectId)} aria-current={th.prospectId === selected ? "true" : undefined}
            className={`w-full rounded-xl p-3 text-left text-sm ${th.prospectId === selected ? "bg-blue-50" : ""}`}>
            <span className="flex items-center justify-between gap-2"><strong>{pr.name}</strong><span className="text-xs text-slate-500">{t.channels[pr.channel]}</span></span>
            <span className="mt-1 block truncate text-slate-600">{lastItem}</span>
            {th.unread > 0 && <span className="mt-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{th.unread} {t.unread}</span>}
            {th.transferred && <span className="mt-1 ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{t.transferred}</span>}
          </button></li>; })}
      </ul>
    </div>

    <div className={`grid content-start gap-3 rounded-2xl bg-white p-4 shadow-sm ${opened ? "" : "hidden lg:grid"}`}>
      <button type="button" onClick={() => setOpened(false)} className="w-fit rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 lg:hidden">{t.back}</button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-bold">{p.name}</h2>
          <p className="text-xs text-slate-500">{pick(p.business, lang)} · {t.channels[p.channel]} · ***{p.phoneLast4}</p>
          <p className="mt-1 text-xs"><span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{t.stage}: {t.stages[p.stage]}</span>
            <span className="ml-1 text-slate-500">{t.owner}: {p.owner ?? t.unassigned}</span></p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.consent ? "bg-green-100 text-green-950" : "bg-red-100 text-red-900"}`}>{p.consent ? t.consentYes : t.consentNo}</span>
      </div>

      <div aria-label={t.actions} className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip} onClick={() => startCall(p.id)}>{t.call}</button>
        <button type="button" className={chip} onClick={followup}>{t.followup}</button>
        {STAGES.indexOf(p.stage) < STAGES.length - 1 && <button type="button" className={chip} onClick={nextStage}>{t.nextStage}</button>}
        {!p.owner && <button type="button" className={chip} onClick={() => { updateProspect({ owner: t.you }); log(t.log.assigned(p.name)); }}>{t.assignMe}</button>}
        {!thread.transferred && <button type="button" className={chip} onClick={transfer}>{t.transfer}</button>}
        <button type="button" className={chip} onClick={toggleConsent}>{p.consent ? t.optOut : t.optIn}</button>
      </div>

      <ul className="grid max-h-[55vh] gap-2 overflow-y-auto rounded-xl bg-slate-50 p-2">
        {all.map((m, i) => <Bubble key={i} who={m.from} text={m.text} t={t}
          note={i >= thread.messages.length ? (m.from === "client" ? t.clientDemo : m.from === "system" ? undefined : t.notSent) : undefined} />)}
        {typing && <li className="w-fit rounded-xl bg-white px-3 py-2 text-xs italic text-slate-500">{t.typing(typing)}</li>}
      </ul>

      {waiting && !thread.transferred && !typing && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
        <p className="text-xs font-bold text-blue-700">{t.axiraSuggests} · {sug.source}</p>
        <p className="mt-1 text-blue-900">{sug.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white" onClick={() => sug.handoff ? transfer() : reply("axira", sug.text)}>{sug.handoff ? t.transfer : t.approveSend}</button>
          {!sug.handoff && <button type="button" className="rounded-lg px-3 py-2" onClick={() => setDraft(sug.text)}>{t.edit}</button>}
        </div>
      </div>}

      <button type="button" onClick={() => setAdvice({ id: selected, data: analyzeConversation({ messages: all, language: lang, catalog, name: p.name }) })}
        className="flex w-fit items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">
        <img src="/axiomos-brain-3d.webp" alt="" width={22} height={22} className="h-5 w-5" />{t.brainAsk}</button>
      {advice && <div className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <p><strong>{t.brainWants}:</strong> {advice.wants}</p>
        <p><strong>{t.brainTone}:</strong> {advice.tone}</p>
        <div><strong>{t.brainReview}:</strong><ul className="ml-4 list-disc">{advice.review.map((r) => <li key={r}>{r}</li>)}</ul></div>
        <p><strong>{t.brainReply}:</strong> {advice.reply}</p>
        <p><strong>{t.brainNext}:</strong> {advice.next}</p>
        <div className="flex flex-wrap gap-2">
          {!thread.transferred && <button type="button" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => { setDraft(advice.reply); setAdvice(null); }}>{t.brainUse}</button>}
          <button type="button" className="rounded-lg px-3 py-1.5 text-xs" onClick={() => setAdvice(null)}>{t.brainClose}</button>
        </div>
      </div>}

      {!thread.transferred && <>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">{t.quickReplies}:</span>
          <button type="button" className={chip} onClick={() => setDraft(priceReply)}>{t.quickPrice}</button>
          <button type="button" className={chip} onClick={() => setDraft(t.quickScheduleText)}>{t.quickSchedule}</button>
          <button type="button" className={chip} onClick={() => setDraft(t.quickThanksText)}>{t.quickThanks}</button>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); reply("agent", draft); }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.writeReply} rows={2} className="flex-1 rounded-lg border p-2.5 text-base" maxLength={600} />
          <button className="rounded-lg bg-slate-950 px-4 py-2.5 font-semibold text-white" disabled={!draft.trim()}>{t.sendOwn}</button>
        </form>
      </>}

      <details className="rounded-xl border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">{t.contactInfo}</summary>
        <p className="mt-2 text-slate-700">{pick(p.note, lang)}</p>
        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{t.notes}</h3>
        <ul className="mt-1 grid gap-1">{(state.notes[p.id] ?? []).map((n, i) => <li key={i} className="rounded-lg bg-amber-50 p-2">{n}</li>)}</ul>
        <div className="mt-2 flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} maxLength={300} className="min-w-0 flex-1 rounded-lg border p-2 text-base" />
          <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white" onClick={saveNote}>{t.addNote}</button>
        </div>
        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{t.contactFollowups}</h3>
        {myFollowups.length ? <ul className="mt-1 grid gap-1">{myFollowups.map((f) => <li key={f.id} className={f.done ? "line-through opacity-70" : ""}>
          {pick(f.task, lang)} · {f.done ? t.done : f.dueInHours < 0 ? `${t.overdue} ${t.agoHours(f.dueInHours)}` : `${t.due} ${t.inHours(f.dueInHours)}`}</li>)}</ul>
          : <p className="mt-1 text-slate-500">{t.none}</p>}
        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{t.contactCalls}</h3>
        {myCalls.length ? <ul className="mt-1 grid gap-1">{myCalls.map((c) => <li key={c.id}>
          <span className="text-xs text-slate-500">{c.direction === "in" ? t.callIn : t.callOut} · {c.minutes} {t.min} · {c.at}</span><br />{pick(c.summary, lang)}</li>)}</ul>
          : <p className="mt-1 text-slate-500">{t.none}</p>}
      </details>
    </div>
  </section>;
}

function Bubble({ who, text, t, note }: { who: Extra["from"]; text: string; t: T; note?: string }) {
  if (who === "system") return <li className="mx-auto max-w-[90%] rounded-lg bg-slate-200 px-3 py-1.5 text-center text-xs text-slate-700">{text}</li>;
  const mine = who !== "client";
  return <li className={`max-w-[85%] rounded-xl p-3 text-sm ${mine ? "ml-auto bg-blue-600 text-white" : "bg-white"}`}>
    <p className="text-xs font-bold opacity-80">{who === "client" ? t.client : who === "axira" ? "Axira" : t.you}</p>
    <p className="mt-0.5">{text}</p>
    {note && <p className="mt-1 text-xs italic opacity-80">{note}</p>}
  </li>;
}

// Llamada simulada: pantalla completa con controles, transcripción de Axira, notas, resultado,
// seguimiento y etapa. Al colgar, Axira resume y se puede guardar en el historial de la demostración.
function CallScreen({ t, lang, p, setState, log, close }: {
  t: T; lang: Lang; p: DemoProspect; setState: SetSt; log: (l: string) => void; close: () => void;
}) {
  const sim = t.sim;
  const script = useMemo(() => sim.script(p.name.replace(" (demo)", ""), pick(p.business, lang)), [sim, p, lang]);
  const [phase, setPhase] = useState<"dialing" | "live" | "ended">("dialing");
  const [secs, setSecs] = useState(0);
  const [lines, setLines] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [hold, setHold] = useState(false);
  const [rec, setRec] = useState(false);
  const [pad, setPad] = useState(false);
  const [digits, setDigits] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(0);
  const [follow, setFollow] = useState<number>(0);
  const [stage, setStage] = useState<Stage>(p.stage);

  useEffect(() => { const id = window.setTimeout(() => setPhase("live"), 2000); return () => window.clearTimeout(id); }, []);
  useEffect(() => {
    if (phase !== "live" || hold) return;
    const id = window.setInterval(() => {
      setSecs((x) => x + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, hold]);
  useEffect(() => {
    if (phase !== "live" || hold || lines >= script.length) return;
    const id = window.setTimeout(() => setLines((n) => n + 1), lines === 0 ? 600 : 2600);
    return () => window.clearTimeout(id);
  }, [phase, hold, lines, script.length]);

  const time = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const status = phase === "dialing" ? sim.dialing : phase === "ended" ? sim.ended : hold ? sim.onHold : sim.connected;
  const tip = sim.tips[Math.min(sim.tips.length - 1, Math.floor(lines / 2))];
  const summary = sim.autoSummary(p.name, sim.results[result], notes.trim());

  const save = () => {
    const minutes = Math.max(1, Math.ceil(secs / 60));
    setState((st) => ({
      ...st,
      calls: [{ id: `c${Date.now()}`, prospectId: p.id, minutes, direction: "out", at: lang === "en" ? "Now" : "Ahora", summary: { es: summary, en: summary } }, ...st.calls],
      followups: follow ? [...st.followups, { id: `f${Date.now()}`, prospectId: p.id, dueInHours: follow, task: { es: t.followupTask, en: t.followupTask }, done: false }] : st.followups,
      prospects: st.prospects.map((x) => x.id === p.id ? { ...x, stage } : x),
      notes: notes.trim() ? { ...st.notes, [p.id]: [notes.trim(), ...(st.notes[p.id] ?? [])] } : st.notes,
      threads: st.threads.map((th) => th.prospectId === p.id ? { ...th, extra: [...th.extra, { from: "system", text: t.sysCall(minutes) }] } : th),
    }));
    log(sim.saved(p.name));
    close();
  };
  const ctl = (on: boolean) => `grid place-items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold ${on ? "bg-white text-slate-950" : "bg-white/10 text-white"}`;

  // data-fx-off: dentro de la llamada no hay efecto 3D de tarjetas (los botones no se mueven al tocarlos).
  return <div role="dialog" aria-modal="true" aria-label={sim.title} data-fx-off=""
    className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 p-4 text-white backdrop-blur">
    <div className="mx-auto grid max-w-md gap-4 pb-10">
      <p className="rounded-lg bg-amber-400/15 px-3 py-2 text-center text-xs text-amber-200">{sim.notice}</p>
      <div className="grid justify-items-center gap-1 pt-2 text-center">
        <span className={`grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 text-3xl font-bold ${phase === "dialing" ? "animate-pulse" : ""}`}>{p.name[0]}</span>
        <h2 className="mt-2 text-xl font-bold">{p.name}</h2>
        <p className="text-sm text-slate-300">{pick(p.business, lang)} · ***{p.phoneLast4}</p>
        <p className="text-sm font-semibold text-green-300" aria-live="polite">{status}{phase !== "dialing" && ` · ${time}`}{rec && phase === "live" && ` · ● ${sim.recording}`}</p>
      </div>

      {phase !== "ended" ? <>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={ctl(muted)} onClick={() => setMuted((v) => !v)}>{muted ? sim.unmute : sim.mute}</button>
          <button type="button" className={ctl(speaker)} onClick={() => setSpeaker((v) => !v)}>{sim.speaker}</button>
          <button type="button" className={ctl(hold)} disabled={phase !== "live"} onClick={() => setHold((v) => !v)}>{hold ? sim.resume : sim.hold}</button>
          <button type="button" className={ctl(rec)} disabled={phase !== "live"} onClick={() => { setRec((v) => !v); if (!rec) setEvents((e) => [sim.recordNotice, ...e]); }}>{rec ? sim.recording : sim.record}</button>
          <button type="button" className={ctl(pad)} onClick={() => setPad((v) => !v)}>{sim.keypad}</button>
          <button type="button" className={ctl(false)} disabled={phase !== "live"} onClick={() => { setEvents((e) => [sim.transferred, ...e]); log(t.log.transferred(p.name)); }}>{sim.transfer}</button>
        </div>
        {pad && <div className="grid gap-2 rounded-2xl bg-white/5 p-3">
          <p className="min-h-6 text-center font-mono text-lg tracking-widest">{digits}</p>
          <div className="grid grid-cols-3 gap-2">{["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) =>
            <button key={d} type="button" className="rounded-xl bg-white/10 py-2 text-lg font-semibold" onClick={() => setDigits((x) => (x + d).slice(-16))}>{d}</button>)}</div>
        </div>}
        <button type="button" onClick={() => { setPhase("ended"); setHold(false); }} className="mx-auto rounded-full bg-red-600 px-8 py-3 font-bold text-white">{sim.hangUp}</button>
        {events.map((e, i) => <p key={i} className="rounded-lg bg-white/10 px-3 py-2 text-xs">{e}</p>)}

        <section className="rounded-2xl bg-white/5 p-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.transcript}</h3>
          <ul className="mt-2 grid max-h-56 gap-2 overflow-y-auto text-sm">
            {script.slice(0, lines).map(([who, text], i) => <li key={i} className={`max-w-[85%] rounded-xl px-3 py-2 ${who === "you" ? "ml-auto bg-blue-600" : "bg-white/10"}`}>
              <span className="block text-[11px] font-bold opacity-75">{who === "you" ? t.you : t.client}</span>{text}</li>)}
          </ul>
          {phase === "live" && <p className="mt-2 rounded-lg bg-fuchsia-500/15 px-3 py-2 text-xs text-fuchsia-100"><strong>{sim.tip}:</strong> {tip}</p>}
        </section>
      </> : <section className="rounded-2xl bg-white/5 p-3 text-sm">
        <h3 className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.summary}</h3>
        <p className="mt-1 text-xs text-slate-300">{sim.duration}: {time}</p>
        <p className="mt-2">{summary}</p>
      </section>}

      <section className="grid gap-3 rounded-2xl bg-white/5 p-3 text-sm">
        <label className="grid gap-1"><span className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.notes}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder={sim.notesPh}
            className="rounded-lg border border-white/20 bg-slate-900 p-2 text-base text-white" /></label>
        <div><p className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.result}</p>
          <div className="mt-1 flex flex-wrap gap-2">{sim.results.map((r, i) =>
            <button key={r} type="button" onClick={() => setResult(i)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${result === i ? "bg-blue-500 text-white" : "bg-white/10"}`}>{r}</button>)}</div></div>
        <div><p className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.followup}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {[[sim.noFollowup, 0] as [string, number], ...sim.followups].map(([label, h]) =>
              <button key={label} type="button" onClick={() => setFollow(h)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${follow === h ? "bg-blue-500 text-white" : "bg-white/10"}`}>{label}</button>)}</div></div>
        <label className="grid gap-1"><span className="text-xs font-bold uppercase tracking-wide text-blue-300">{sim.stage}</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="rounded-lg border border-white/20 bg-slate-900 p-2 text-base text-white">
            {STAGES.map((st) => <option key={st} value={st}>{t.stages[st]}</option>)}</select></label>
      </section>

      {phase === "ended" && <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">{sim.save}</button>
        <button type="button" onClick={close} className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold">{sim.discard}</button>
      </div>}
    </div>
  </div>;
}

function Prospects({ t, lang, state, setState, log, openContact }: { t: T; lang: Lang; state: St; setState: SetSt; log: (l: string) => void; openContact: (id: string) => void }) {
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
          {list.map((p) => <li key={p.id} className="fx-card rounded-xl border border-slate-200 p-3 text-sm">
            <button type="button" onClick={() => openContact(p.id)} className="text-left font-semibold text-blue-700 underline-offset-2 hover:underline">{p.name}</button>
            <p className="text-xs text-slate-500">{pick(p.business, lang)} · {t.channels[p.channel]}</p>
            <p className="mt-1 text-xs">{pick(p.note, lang)}</p>
            <p className="mt-1 text-xs text-slate-500">{t.owner}: {p.owner ?? t.unassigned}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {STAGES.indexOf(stage) > 0 && <button type="button" className="rounded-lg px-2 py-1 text-xs" onClick={() => move(p, -1)}>{t.moveBack}</button>}
              {STAGES.indexOf(stage) < STAGES.length - 1 && <button type="button" className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => move(p, 1)}>{t.moveNext}</button>}
              <button type="button" className="rounded-lg px-2 py-1 text-xs" onClick={() => openContact(p.id)}>{t.openChat}</button>
              {!p.owner && <button type="button" className="rounded-lg px-2 py-1 text-xs" onClick={() => {
                setState((st) => ({ ...st, prospects: st.prospects.map((x) => x.id === p.id ? { ...x, owner: t.you } : x) })); log(t.log.assigned(p.name));
              }}>{t.assignMe}</button>}
            </div>
          </li>)}
        </ul>
      </div>; })}
  </section>;
}

function Followups({ t, lang, state, setState, prospect, log, openContact }: {
  t: T; lang: Lang; state: St; setState: SetSt; prospect: (id: string) => DemoProspect; log: (l: string) => void; openContact: (id: string) => void;
}) {
  const update = (f: DemoFollowup, patch: Partial<DemoFollowup>) =>
    setState((st) => ({ ...st, followups: st.followups.map((x) => x.id === f.id ? { ...x, ...patch } : x) }));
  const sorted = [...state.followups].sort((a, b) => Number(a.done) - Number(b.done) || a.dueInHours - b.dueInHours);
  return <section className="rounded-2xl bg-white p-4 shadow-sm">
    <h2 className="font-bold">{t.sections.seguimientos} · {state.followups.filter((f) => !f.done).length} {t.pendingFollowups} · {state.followups.filter((f) => !f.done && f.dueInHours < 0).length} {t.overdueCount}</h2>
    <ul className="mt-3 grid gap-2">
      {sorted.map((f) => { const p = prospect(f.prospectId); const late = !f.done && f.dueInHours < 0;
        return <li key={f.id} className={`fx-card rounded-xl border p-3 text-sm ${late ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={f.done ? "line-through opacity-70" : "font-semibold"}>{pick(f.task, lang)}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${f.done ? "bg-green-100 text-green-950" : late ? "bg-red-100 text-red-900" : "bg-slate-100"}`}>
              {f.done ? t.done : late ? `${t.overdue} · ${t.agoHours(f.dueInHours)}` : `${t.due} ${t.inHours(f.dueInHours)}`}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500"><button type="button" onClick={() => openContact(p.id)} className="font-semibold text-blue-700">{p.name}</button> · {pick(p.business, lang)}</p>
          {!f.done && <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => { update(f, { done: true }); log(t.log.done(pick(f.task, lang))); }}>{t.markDone}</button>
            <button type="button" className="rounded-lg px-3 py-1.5 text-xs" onClick={() => { update(f, { dueInHours: Math.max(f.dueInHours, 0) + 24 }); log(t.log.postponed(pick(f.task, lang))); }}>{t.postpone}</button>
          </div>}
        </li>; })}
    </ul>
  </section>;
}

function Calls({ t, lang, state, prospect, openContact, startCall }: {
  t: T; lang: Lang; state: St; prospect: (id: string) => DemoProspect; openContact: (id: string) => void; startCall: (id: string) => void;
}) {
  const used = state.calls.reduce((n, c) => n + c.minutes, 0);
  const [who, setWho] = useState(state.prospects[0]?.id ?? "");
  return <section className="grid gap-4">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{t.minutesUsed}</p>
      <p className="text-3xl font-bold text-blue-700">{used} <span className="text-base font-normal text-slate-600">{t.ofPlan}</span></p>
      <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, (used / 200) * 100)}%` }} /></div>
      <p className="mt-2 text-xs text-slate-500">{t.callNote}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="demo-call-who">{t.sim.pick}</label>
        <select id="demo-call-who" value={who} onChange={(e) => setWho(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2.5 text-base">
          {state.prospects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" onClick={() => who && startCall(who)} className="rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white">{t.sim.newCall}</button>
      </div>
    </div>
    <ul className="grid gap-2">
      {state.calls.map((c) => { const p = prospect(c.prospectId);
        return <li key={c.id} className="fx-card rounded-2xl bg-white p-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => openContact(p.id)} className="font-bold text-blue-700">{p.name}</button>
            <span className="text-xs text-slate-500">{c.direction === "in" ? t.callIn : t.callOut} · {c.minutes} {t.min} · {c.at}</span></div>
          <p className="mt-1"><span className="text-xs font-bold text-blue-700">Axira · </span>{pick(c.summary, lang)}</p>
          <button type="button" onClick={() => startCall(p.id)} className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">{t.sim.callAgain}</button>
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
        <div key={label} className="fx-card rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
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

// Brain en la demostración: mismas respuestas que el Brain real, con un límite de 5 preguntas solo en esta pantalla.
const DEMO_BRAIN_LIMIT = 5;
function BrainDemo({ t, lang, catalog, state, overdue, log }: { t: T; lang: Lang; catalog: Catalog; state: St; overdue: number; log: (l: string) => void }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "brain"; text: string; free?: boolean }>>([]);
  const [used, setUsed] = useState(0);
  const [extra, setExtra] = useState(0);
  const [draft, setDraft] = useState("");
  const allowance = useMemo(() => brainAllowance(catalog, {}), [catalog]);
  const limit = DEMO_BRAIN_LIMIT + extra;
  const count = (s: Stage) => state.prospects.filter((p) => p.stage === s).length;
  const crm = {
    offers: { active: [lang === "en" ? "Autopilot promo (demo)" : "Promoción Autopilot (demo)"], drafts: [], expiring: [] },
    prospects: { total: state.prospects.length, new_count: count("nuevo"), interested_count: count("interesado"), followup_count: count("seguimiento"),
      overdue_count: overdue, due_next_7_days: state.followups.filter((f) => !f.done && f.dueInHours >= 0).length },
  };
  const ask = (q: string) => {
    const text = q.trim();
    if (text.length < 2 || used >= limit) return;
    const demoAllowance = { ...allowance, plan: { key: "demo", name: lang === "en" ? "Demo" : "Demostración", questions: DEMO_BRAIN_LIMIT }, limit, packs: extra ? 1 : 0 };
    const r = answerBrain({ message: text, language: lang, catalog, crm, allowance: demoAllowance, used: used + 1 });
    if (r.charge) setUsed((u) => u + 1);
    setMessages((m) => [...m, { role: "user", text }, { role: "brain", text: r.text, free: !r.charge }]);
    setDraft("");
  };
  const b = t.brain;
  return <section className="grid gap-4">
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <img src="/axiomos-brain-icon.webp" alt="" width={48} height={48} className="h-12 w-12 rounded-full bg-slate-950 p-1" />
        <p className="text-sm text-slate-700">{b.intro}</p>
      </div>
      <p className="mt-3 text-sm font-semibold" aria-live="polite">{b.meter(Math.max(0, limit - used), limit)}</p>
      <div className="mt-3 grid max-h-[50vh] gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {messages.length === 0 && <div className="flex flex-wrap gap-2">{b.suggestions.map((s) => <button key={s} type="button" onClick={() => ask(s)}
          className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-blue-800">{s}</button>)}</div>}
        {messages.map((m, i) => <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "justify-self-end bg-blue-600 text-white" : "border border-slate-200 bg-white"}`}>
          {m.text}{m.free && <span className="mt-1 block text-xs font-semibold text-slate-500">{b.free}</span>}</p>)}
      </div>
      {used >= limit ? <div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <p className="text-sm">{b.blocked}</p>
        {allowance.pack && <p className="mt-1 text-sm font-semibold">{b.pack(allowance.pack.questions.toLocaleString(lang === "en" ? "en-US" : "es-PR"), money(allowance.pack.price_cents))}</p>}
        <button type="button" className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => { setExtra((e) => e + (allowance.pack?.questions ?? 5)); log(b.packAdded); }}>{b.addPack}</button>
      </div> : <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} placeholder={b.placeholder} aria-label={b.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base" />
        <button type="submit" disabled={draft.trim().length < 2} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{b.send}</button>
      </form>}
    </div>
  </section>;
}
