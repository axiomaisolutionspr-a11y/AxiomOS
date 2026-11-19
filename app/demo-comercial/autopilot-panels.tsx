"use client";

// AxiomOS Autopilot v3 — paneles del DEMO comercial.
// Las tareas internas (asignación, seguimiento, transferencia, auditoría) se guardan en este navegador.
// Los cambios de etapa se guardan en Neon QA mediante el PATCH existente. Nada se envía a clientes.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeLead, assignSeller, defaultPlaybook, formatHours, MODE_LABEL, pipelineMetrics, planActions,
  productivity, sanitizePlaybook, searchLeads, SELLERS, ACTION_RISK,
  type AuditEntry, type AutonomyMode, type Lead, type LeadStatus, type Playbook, type ProposedAction,
} from "./autopilot-engine";

const STORAGE_KEY = "axiomos_demo_autopilot_v3";
const MAX_LOG = 200;

type Stored = {
  mode: AutonomyMode; playbook: Playbook; assignments: Record<string, string>;
  followups: Record<string, string>; handoffs: Record<string, string>;
  done: string[]; approvedDrafts: string[]; log: AuditEntry[];
};
const empty = (): Stored => ({ mode: "supervisado", playbook: defaultPlaybook(), assignments: {}, followups: {}, handoffs: {}, done: [], approvedDrafts: [], log: [] });

function load(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const v = JSON.parse(raw) as Partial<Stored>;
    const obj = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, string> : {});
    return {
      mode: v.mode === "asistir" || v.mode === "autonomo" ? v.mode : "supervisado",
      playbook: sanitizePlaybook(v.playbook),
      assignments: obj(v.assignments), followups: obj(v.followups), handoffs: obj(v.handoffs),
      done: Array.isArray(v.done) ? v.done.filter(x => typeof x === "string").slice(-500) : [],
      approvedDrafts: Array.isArray(v.approvedDrafts) ? v.approvedDrafts.filter(x => typeof x === "string").slice(-100) : [],
      log: Array.isArray(v.log) ? v.log.slice(0, MAX_LOG) as AuditEntry[] : [],
    };
  } catch { return empty(); }
}

const uid = () => crypto.randomUUID();
const prTime = (iso: string) => new Intl.DateTimeFormat("es-PR", { timeZone: "America/Puerto_Rico", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/** Estado compartido del Autopilot. updateStatus debe devolver true solo si Neon QA confirmó el cambio. */
export function useAutopilot(leads: Lead[], updateStatus: (id: string, status: LeadStatus) => Promise<boolean>) {
  const [state, setState] = useState<Stored>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [running, setRunning] = useState(false);

  useEffect(() => { setState(load()); setHydrated(true); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!hydrated) return; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* almacenamiento no disponible */ } }, [state, hydrated]);

  const sellerFor = useCallback((lead: Lead) => assignSeller(lead, state.assignments), [state.assignments]);
  const planFor = useCallback((lead: Lead): ProposedAction[] => {
    const analysis = analyzeLead(lead, now);
    return planActions({ lead, analysis, playbook: state.playbook, mode: state.mode, seller: sellerFor(lead), now, approvedDrafts: state.approvedDrafts })
      .filter(a => !state.done.includes(a.id));
  }, [now, state.playbook, state.mode, state.approvedDrafts, state.done, sellerFor]);

  const queue = useMemo(() => leads.flatMap(l => planFor(l).filter(a => a.decision === "requiere_aprobacion")), [leads, planFor]);

  function record(s: Stored, lead: Lead, action: ProposedAction, outcome: AuditEntry["outcome"], by: AuditEntry["by"], persisted: AuditEntry["persisted"], detail = action.detail): Stored {
    const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), leadId: lead.id, leadName: lead.name, kind: action.kind, title: action.title, detail, outcome, by, persisted };
    return { ...s, done: [...s.done, action.id], log: [entry, ...s.log].slice(0, MAX_LOG) };
  }
  function applyInternal(s: Stored, action: ProposedAction): Stored {
    const p = action.payload ?? {};
    if (action.kind === "asignar_vendedor" && p.sellerId) return { ...s, assignments: { ...s.assignments, [action.leadId]: p.sellerId } };
    if (action.kind === "programar_seguimiento" && p.dueAt) return { ...s, followups: { ...s.followups, [action.leadId]: p.dueAt } };
    if (action.kind === "transferir_humano" && p.sellerId) return { ...s, handoffs: { ...s.handoffs, [action.leadId]: p.sellerId }, assignments: { ...s.assignments, [action.leadId]: s.assignments[action.leadId] ?? p.sellerId } };
    return s;
  }

  /** Aprueba (persona) o ejecuta (Axira) una acción. Lo externo nunca se ejecuta. */
  async function resolve(action: ProposedAction, by: AuditEntry["by"], editedDraft?: string): Promise<string> {
    const lead = leads.find(l => l.id === action.leadId);
    if (!lead) return "Prospecto no encontrado.";
    const risk = ACTION_RISK[action.kind];
    if (risk === "external" || risk === "forbidden") {
      setState(s => record(s, lead, action, "bloqueada", by, "Este navegador", action.reason));
      return "Acción bloqueada y registrada. No se envió nada.";
    }
    if (action.kind === "avanzar_etapa" && action.payload?.status) {
      const ok = await updateStatus(lead.id, action.payload.status);
      setState(s => record(s, lead, action, ok ? (by === "Axira" ? "ejecutada" : "aprobada") : "error", by, "Neon QA",
        ok ? `Etapa cambiada a «${action.payload?.status}» y confirmada por Neon QA.` : "Neon QA no confirmó el cambio; la etapa no cambió."));
      return ok ? "Etapa actualizada en Neon QA." : "Neon QA no confirmó el cambio.";
    }
    if (action.kind === "borrador_respuesta") {
      const text = (editedDraft ?? action.payload?.draft ?? "").trim().slice(0, 500);
      if (!text) return "La respuesta está vacía.";
      setState(s => ({ ...record(s, lead, action, "aprobada", by, "Este navegador", `Aprobada, no enviada: «${text}»`), approvedDrafts: [...s.approvedDrafts, text].slice(-100) }));
      return "Respuesta aprobada. Queda lista para enviar cuando el canal real y el consentimiento estén activos; no se envió.";
    }
    setState(s => record(applyInternal(s, action), lead, action, by === "Axira" ? "ejecutada" : "aprobada", by, "Este navegador"));
    return "Acción registrada.";
  }
  function discard(action: ProposedAction) {
    const lead = leads.find(l => l.id === action.leadId);
    if (lead) setState(s => record(s, lead, action, "descartada", "Persona", "Este navegador"));
  }

  /** Recorre los prospectos abiertos y ejecuta solo lo que la política permite. */
  async function runAutopilot(only?: string): Promise<string> {
    if (running) return "";
    setRunning(true);
    let executed = 0, blocked = 0;
    try {
      for (const lead of leads.filter(l => l.status !== "Ganado" && (!only || l.id === only))) {
        for (const action of planFor(lead)) {
          if (action.decision === "ejecutada") { await resolve(action, "Axira"); executed++; }
          else if (action.decision === "bloqueada") { await resolve(action, "Axira"); blocked++; }
        }
      }
    } finally { setRunning(false); }
    const waiting = leads.filter(l => !only || l.id === only).flatMap(l => planFor(l)).filter(a => a.decision === "requiere_aprobacion").length;
    return `Autopilot terminó: ${executed} acciones ejecutadas, ${blocked} bloqueadas por política${waiting ? ` y ${waiting} esperan tu aprobación` : ""}. No se envió ningún mensaje.`;
  }

  return {
    ...state, now, running, queue, planFor, sellerFor, resolve, discard, runAutopilot,
    setMode: (mode: AutonomyMode) => setState(s => ({ ...s, mode })),
    setPlaybook: (playbook: Playbook) => setState(s => ({ ...s, playbook: sanitizePlaybook(playbook) })),
    resetLocal: () => setState(empty()),
  };
}
export type AutopilotApi = ReturnType<typeof useAutopilot>;

// ───────────────────────── Barra de búsqueda y filtros del CRM ─────────────────────────

export type LeadFilter = "todos" | "responder" | "olvidados" | "riesgo";
export function filterLeads(leads: Lead[], query: string, filter: LeadFilter, now: number): Lead[] {
  return searchLeads(leads, query).filter(l => {
    if (filter === "todos") return true;
    const a = analyzeLead(l, now);
    return filter === "responder" ? a.awaitingReply : filter === "olvidados" ? a.stale : a.sentiment === "en riesgo";
  });
}
export function CrmToolbar({ query, setQuery, filter, setFilter, leads, now }: {
  query: string; setQuery: (v: string) => void; filter: LeadFilter; setFilter: (v: LeadFilter) => void; leads: Lead[]; now: number;
}) {
  const counts = useMemo(() => {
    const a = leads.map(l => analyzeLead(l, now));
    return { todos: leads.length, responder: a.filter(x => x.awaitingReply).length, olvidados: a.filter(x => x.stale).length, riesgo: a.filter(x => x.sentiment === "en riesgo").length };
  }, [leads, now]);
  const chips: Array<[LeadFilter, string]> = [["todos", "Todos"], ["responder", "Esperan respuesta"], ["olvidados", "Olvidados"], ["riesgo", "En riesgo"]];
  return (
    <div className="ap-toolbar">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={80}
        placeholder="Buscar nombre, canal o texto de la conversación" aria-label="Buscar en prospectos y conversaciones" />
      <div className="ap-chips" role="group" aria-label="Filtrar prospectos">
        {chips.map(([key, label]) => <button type="button" key={key} className={filter === key ? "active" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} <b>{counts[key]}</b></button>)}
      </div>
    </div>
  );
}

export function LeadBadges({ lead, now }: { lead: Lead; now: number }) {
  const a = analyzeLead(lead, now);
  return <span className="ap-badges">
    <i className="ap-score" title={a.reasons.join("\n")}>{a.score}</i>
    {a.awaitingReply && <i className="ap-dot ap-dot-reply">Espera respuesta</i>}
    {a.stale && <i className="ap-dot ap-dot-stale">Olvidado</i>}
    {a.sentiment === "en riesgo" && <i className="ap-dot ap-dot-risk">En riesgo</i>}
  </span>;
}

// ───────────────────────── Inteligencia de Axira en la ficha ─────────────────────────

const decisionLabel = { ejecutada: "Axira puede ejecutarla", requiere_aprobacion: "Espera tu aprobación", bloqueada: "Bloqueada por política" } as const;

export function LeadIntelligence({ lead, api, busy, onNotice }: { lead: Lead; api: AutopilotApi; busy: boolean; onNotice: (t: string) => void }) {
  const a = analyzeLead(lead, api.now);
  const seller = api.sellerFor(lead);
  const plan = api.planFor(lead);
  const draftAction = plan.find(p => p.kind === "borrador_respuesta");
  const [draft, setDraft] = useState(draftAction?.payload?.draft ?? "");
  useEffect(() => { setDraft(draftAction?.payload?.draft ?? ""); }, [draftAction?.id, draftAction?.payload?.draft]);
  const handedTo = SELLERS.find(s => s.id === api.handoffs[lead.id]);
  const assigned = SELLERS.find(s => s.id === api.assignments[lead.id]);
  const due = api.followups[lead.id];
  const history = api.log.filter(e => e.leadId === lead.id).slice(0, 6);
  const act = async (fn: () => Promise<string> | string) => { const t = await fn(); if (t) onNotice(t); };

  return (
    <section className="ap-intel" aria-label="Inteligencia de Axira">
      <div className="ap-intel-head">
        <div className="ap-gauge" style={{ ["--p" as string]: `${a.score * 3.6}deg` }} role="img" aria-label={`Puntuación ${a.score} de 100`}><span>{a.score}</span></div>
        <div>
          <small>INTELIGENCIA DE AXIRA · REGLAS EXPLICABLES</small>
          <p className="ap-summary">{a.summary}</p>
          <div className="ap-tags">
            {a.intents.map(i => <span key={i.key}>{i.label}</span>)}
            <span className={`ap-sent ap-sent-${a.sentiment === "en riesgo" ? "risk" : a.sentiment}`}>Tono {a.sentiment}</span>
            <span className={a.stale ? "ap-sla-late" : ""}>{a.slaLabel} · {formatHours(a.ageHours)}</span>
          </div>
        </div>
      </div>
      <details className="ap-why"><summary>¿Por qué {a.score}/100?</summary><ul>{a.reasons.map(r => <li key={r}>{r}</li>)}</ul></details>

      <div className="ap-owner">
        <span>Responsable: <b>{assigned?.name ?? `Sin asignar (sugerido: ${seller.name})`}</b></span>
        {due && <span>Seguimiento: <b>{prTime(due)}</b></span>}
        {handedTo && <span className="ap-handed">Transferido a {handedTo.name}</span>}
      </div>

      {draftAction && <div className="ap-draft">
        <label htmlFor={`draft-${lead.id}`}>Respuesta sugerida por Axira · editable · {draftAction.decision === "bloqueada" ? "bloqueada" : "requiere aprobación"}</label>
        <textarea id={`draft-${lead.id}`} value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} rows={3} />
        <div className="ap-row">
          <button type="button" className="ap-approve" disabled={busy || api.running || !draft.trim()} onClick={() => act(() => api.resolve(draftAction, "Persona", draft))}>Aprobar respuesta</button>
          <button type="button" className="ap-ghost" disabled={busy || api.running} onClick={() => { api.discard(draftAction); onNotice("Respuesta descartada."); }}>Descartar</button>
          <small>Aprobar no la envía: el DEMO no tiene canal real ni consentimiento.</small>
        </div>
      </div>}

      <h4>Plan de próximas acciones</h4>
      {plan.filter(p => p.kind !== "borrador_respuesta").length === 0 ? <p className="ap-muted">{lead.status === "Ganado" ? "Oportunidad ganada: Axira no propone más acciones." : "No hay acciones pendientes con el flujo actual."}</p> :
        <ul className="ap-plan">{plan.filter(p => p.kind !== "borrador_respuesta").map(p => (
          <li key={p.id} className={`ap-plan-${p.decision}`}>
            <div><b>{p.title}</b><span>{p.detail}</span><em>{decisionLabel[p.decision]} · {p.reason}</em></div>
            {p.decision === "requiere_aprobacion" && <div className="ap-row">
              <button type="button" className="ap-approve" disabled={busy || api.running} onClick={() => act(() => api.resolve(p, "Persona"))}>Aprobar</button>
              <button type="button" className="ap-ghost" disabled={busy || api.running} onClick={() => api.discard(p)}>Descartar</button>
            </div>}
          </li>))}
        </ul>}
      <button type="button" className="ap-run" disabled={busy || api.running || lead.status === "Ganado"} onClick={() => act(() => api.runAutopilot(lead.id))}>
        {api.running ? "Axira trabajando…" : "✦ Dejar que Axira trabaje este prospecto"}
      </button>

      {history.length > 0 && <><h4>Lo que Axira ya hizo aquí</h4><ol className="ap-log ap-log-compact">{history.map(e => <li key={e.id} className={`ap-out-${e.outcome}`}><time>{prTime(e.at)}</time><b>{e.title}</b><span>{e.outcome} · {e.by} · {e.persisted}</span></li>)}</ol></>}
    </section>
  );
}

// ───────────────────────── Pestaña Autopilot ─────────────────────────

const stepIcon: Record<string, string> = {
  clasificar: "◎", crear_oportunidad: "▤", asignar_vendedor: "◉", programar_seguimiento: "◷",
  borrador_respuesta: "✎", transferir_humano: "⇄", avanzar_etapa: "➤", enviar_mensaje: "✉",
};

export function AutopilotTab({ leads, api, busy, onNotice, onOpenLead }: { leads: Lead[]; api: AutopilotApi; busy: boolean; onNotice: (t: string) => void; onOpenLead: (id: string) => void }) {
  const metrics = useMemo(() => pipelineMetrics(leads, api.now, api.assignments), [leads, api.now, api.assignments]);
  const prod = productivity(api.log);
  const maxStage = Math.max(1, ...metrics.byStatus.map(s => s.count));
  const maxLoad = Math.max(1, ...metrics.sellerLoad.map(s => s.open));
  const pendingFollowups = Object.entries(api.followups).filter(([id]) => leads.some(l => l.id === id && l.status !== "Ganado")).length;
  const toggle = (index: number, field: "enabled" | "requireApproval") => {
    const steps = api.playbook.steps.map((s, i) => i === index ? { ...s, [field]: !s[field] } : s);
    api.setPlaybook({ ...api.playbook, steps });
  };

  return (
    <section className="ad-panel ap-tab">
      <div className="ad-panelhead"><div><b>Axira Autopilot · centro de control</b><small>Autonomía con permisos, aprobación humana y registro de cada acción</small></div>
        <button type="button" className="ap-run" disabled={busy || api.running || leads.length === 0} onClick={async () => onNotice(await api.runAutopilot())}>{api.running ? "Axira trabajando…" : "✦ Ejecutar Autopilot"}</button></div>

      <div className="ap-grid">
        <div className="ap-card ap-modes">
          <h3>Nivel de autonomía</h3>
          {(Object.keys(MODE_LABEL) as AutonomyMode[]).map(m => <label key={m} className={api.mode === m ? "active" : ""}>
            <input type="radio" name="ap-mode" checked={api.mode === m} onChange={() => api.setMode(m)} /> <span>{MODE_LABEL[m]}</span></label>)}
          <p className="ap-muted">En todos los niveles: cobros prohibidos y mensajes externos bloqueados hasta conectar el canal real con consentimiento.</p>
        </div>

        <div className="ap-card ap-flow">
          <h3>Flujo del Autopilot <small>constructor sin código</small></h3>
          <div className="ap-node ap-trigger"><span>⚡</span><b>{api.playbook.trigger}</b></div>
          {api.playbook.steps.map((s, i) => {
            const risk = ACTION_RISK[s.kind];
            const locked = risk === "external" || risk === "forbidden";
            return <div key={s.kind} className={`ap-node ${s.enabled ? "" : "off"} ${locked ? "locked" : ""}`}>
              <span aria-hidden="true">{stepIcon[s.kind]}</span>
              <b>{s.label}</b>
              <label><input type="checkbox" checked={s.enabled} onChange={() => toggle(i, "enabled")} /> Activo</label>
              {locked ? <em>Bloqueado: necesita canal real</em> :
                <label><input type="checkbox" checked={s.requireApproval} disabled={s.kind === "borrador_respuesta"} onChange={() => toggle(i, "requireApproval")} /> Aprobación humana</label>}
            </div>;
          })}
        </div>
      </div>

      <div className="ap-card">
        <h3>Esperan tu aprobación <b className="ap-count">{api.queue.length}</b></h3>
        {api.queue.length === 0 ? <p className="ap-muted">Nada pendiente. Ejecuta el Autopilot o registra un prospecto nuevo.</p> :
          <ul className="ap-plan">{api.queue.slice(0, 12).map(p => { const l = leads.find(x => x.id === p.leadId); return (
            <li key={p.id} className="ap-plan-requiere_aprobacion">
              <div><b>{p.title} · <button type="button" className="ap-link" onClick={() => onOpenLead(p.leadId)}>{l?.name}</button></b><span>{p.detail}</span><em>{p.reason}</em></div>
              <div className="ap-row">
                <button type="button" className="ap-approve" disabled={busy || api.running} onClick={async () => onNotice(await api.resolve(p, "Persona"))}>Aprobar</button>
                <button type="button" className="ap-ghost" disabled={busy || api.running} onClick={() => api.discard(p)}>Descartar</button>
              </div>
            </li>); })}</ul>}
      </div>

      <div className="ap-card">
        <h3>Inteligencia comercial <small>calculada de los {metrics.total} prospectos en Neon QA</small></h3>
        <div className="ap-kpis">
          <div><b>{metrics.awaitingReply}</b><span>esperan respuesta</span></div>
          <div className={metrics.stale ? "warn" : ""}><b>{metrics.stale}</b><span>olvidados (fuera de SLA)</span></div>
          <div className={metrics.atRisk ? "warn" : ""}><b>{metrics.atRisk}</b><span>con tono en riesgo</span></div>
          <div><b>{pendingFollowups}</b><span>seguimientos programados</span></div>
          <div><b>{metrics.avgScore}</b><span>puntuación media abierta</span></div>
        </div>
        <div className="ap-charts">
          <div><h4>Embudo</h4>{metrics.byStatus.map(s => <div className="ap-bar" key={s.status}><span>{s.status}</span><i style={{ width: `${(s.count / maxStage) * 100}%` }} /><b>{s.count}</b></div>)}</div>
          <div><h4>Conversión por canal</h4>{metrics.byChannel.length === 0 ? <p className="ap-muted">Sin datos.</p> : metrics.byChannel.map(c => <div className="ap-bar" key={c.channel}><span>{c.channel.replace(" (simulado)", "")}</span><i style={{ width: `${c.rate * 100}%` }} /><b>{c.won}/{c.total}</b></div>)}</div>
          <div><h4>Carga por vendedor</h4>{metrics.sellerLoad.map(s => <div className="ap-bar" key={s.seller.id}><span>{s.seller.name.replace(/ \(fictici[oa]\)/, "")}</span><i style={{ width: `${(s.open / maxLoad) * 100}%` }} /><b>{s.open}</b></div>)}</div>
        </div>
        <div className="ap-prod">
          <h4>Productividad de Axira</h4>
          <span><b>{prod.executed}</b> ejecutadas</span><span><b>{prod.approved}</b> aprobadas por personas</span>
          <span><b>{prod.blocked}</b> bloqueadas por seguridad</span><span><b>{prod.discarded}</b> descartadas</span><span><b>{prod.leadsTouched}</b> prospectos atendidos</span>
        </div>
        <p className="ap-muted">No medido en el DEMO, para no inventar cifras: valor de oportunidades, tiempo real de respuesta y costos de telefonía e IA. Requieren montos del catálogo y registros reales de entrega.</p>
      </div>

      <div className="ap-card">
        <div className="ap-row ap-between"><h3>Registro de auditoría</h3>
          <button type="button" className="ap-ghost" disabled={api.running} onClick={() => { api.resetLocal(); onNotice("Registro local reiniciado. Las etapas guardadas en Neon QA no cambian."); }}>Reiniciar registro local</button></div>
        {api.log.length === 0 ? <p className="ap-muted">Aún no hay actividad. Cada acción de Axira o de una persona aparece aquí con fecha, resultado y dónde quedó guardada.</p> :
          <ol className="ap-log">{api.log.slice(0, 30).map(e => <li key={e.id} className={`ap-out-${e.outcome}`}>
            <time>{prTime(e.at)}</time><b>{e.title}</b><span>{e.leadName} · {e.outcome} por {e.by} · {e.persisted}</span><small>{e.detail}</small></li>)}</ol>}
      </div>
    </section>
  );
}
