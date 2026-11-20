// AxiomOS Autopilot v3 — motor de decisiones del DEMO comercial.
// Módulo puro: sin red, sin proveedores, sin base de datos. Todas las reglas son
// deterministas y explicables, para que cada recomendación de Axira se pueda auditar.
// Nada de este archivo envía mensajes, cobra, reserva ni contacta a nadie.

export type Industry = "dealer" | "restaurant" | "optica";
export type LeadStatus = "Nuevo" | "Contactar" | "Cita solicitada" | "Ganado";
export type Message = { id: string; by: "cliente" | "axira"; text: string };
export type Lead = {
  id: string; industry: Industry; name: string; contact: string;
  need: string; channel: string; status: LeadStatus;
  priority: "Alta" | "Media"; nextAction: string; messages: Message[]; created: string;
};

export const STATUS_ORDER: LeadStatus[] = ["Nuevo", "Contactar", "Cita solicitada", "Ganado"];
const HOUR = 60 * 60 * 1000;

/** Horas máximas sin atención antes de marcar un prospecto como olvidado. */
export const SLA_HOURS: Record<LeadStatus, number | null> = {
  "Nuevo": 1, "Contactar": 24, "Cita solicitada": 48, "Ganado": null,
};

// ───────────────────────── Análisis del prospecto ─────────────────────────

export type Sentiment = "positivo" | "neutral" | "en riesgo";
export type Intent = { key: string; label: string };
export type LeadAnalysis = {
  score: number;                 // 0–100
  reasons: string[];             // por qué tiene esa puntuación
  intents: Intent[];
  sentiment: Sentiment;
  sentimentEvidence: string | null;
  awaitingReply: boolean;        // el último mensaje es del cliente
  ageHours: number;
  stale: boolean;                // superó el SLA de su etapa
  slaLabel: string;
  summary: string;
};

const INTENTS: Array<{ key: string; label: string; words: string[]; weight: number }> = [
  { key: "financiamiento", label: "Financiamiento", words: ["financiamiento", "financiar", "pagos mensuales", "credito"], weight: 12 },
  { key: "prueba", label: "Prueba de manejo", words: ["prueba de manejo", "probar el"], weight: 12 },
  { key: "reserva", label: "Reservación", words: ["reservar", "reserva", "mesa para"], weight: 10 },
  { key: "cita", label: "Cita", words: ["cita", "examen visual", "espacios esta semana", "horario"], weight: 10 },
  { key: "precio", label: "Precio", words: ["precio", "cuanto cuesta", "costo", "oferta"], weight: 8 },
  { key: "llamada", label: "Pide contacto", words: ["me pueden llamar", "llamenme", "contactarme", "me llaman"], weight: 8 },
  { key: "cambio", label: "Cambio de reserva", words: ["cambiar una reserva", "cambiar la reserva", "reprogramar"], weight: 4 },
];
const POSITIVE = ["gracias", "perfecto", "excelente", "me encanta", "genial", "de acuerdo"];
const NEGATIVE = ["molest", "queja", "nadie me", "no me han", "cancelar", "mal servicio", "esperando", "tarde", "problema", "decepcion"];

/** Minúsculas y sin acentos, para comparar texto en español de forma estable. */
export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function clientText(lead: Lead): string {
  return normalize([lead.need, ...lead.messages.filter(m => m.by === "cliente").map(m => m.text)].join(" \n "));
}

export function analyzeLead(lead: Lead, now: number): LeadAnalysis {
  const text = clientText(lead);
  const reasons: string[] = [];
  let score = 20;

  const intents = INTENTS.filter(i => i.words.some(w => text.includes(normalize(w))));
  for (const intent of intents) { score += intent.weight; reasons.push(`Intención detectada: ${intent.label.toLowerCase()} (+${intent.weight})`); }

  if (lead.priority === "Alta") { score += 15; reasons.push("Prioridad alta asignada al registrarse (+15)"); }

  const stageBonus: Record<LeadStatus, number> = { "Nuevo": 0, "Contactar": 5, "Cita solicitada": 15, "Ganado": 0 };
  if (stageBonus[lead.status]) { score += stageBonus[lead.status]; reasons.push(`Etapa «${lead.status}» (+${stageBonus[lead.status]})`); }

  const clientTurns = lead.messages.filter(m => m.by === "cliente").length;
  if (clientTurns >= 3) { score += 8; reasons.push(`Conversación activa: ${clientTurns} mensajes del cliente (+8)`); }

  const last = lead.messages[lead.messages.length - 1];
  const awaitingReply = !!last && last.by === "cliente" && lead.status !== "Ganado";
  if (awaitingReply) { score += 6; reasons.push("El cliente espera respuesta (+6)"); }

  let sentiment: Sentiment = "neutral";
  let sentimentEvidence: string | null = null;
  const neg = NEGATIVE.find(w => text.includes(w));
  const pos = POSITIVE.find(w => text.includes(w));
  if (neg) { sentiment = "en riesgo"; sentimentEvidence = neg; score -= 10; reasons.push(`Señal de insatisfacción «${neg}» (−10)`); }
  else if (pos) { sentiment = "positivo"; sentimentEvidence = pos; score += 4; reasons.push(`Tono positivo «${pos}» (+4)`); }

  const created = Date.parse(lead.created);
  const ageHours = Number.isFinite(created) ? Math.max(0, (now - created) / HOUR) : 0;
  const sla = SLA_HOURS[lead.status];
  const stale = sla !== null && ageHours > sla;
  if (stale) { score += 5; reasons.push(`Lleva ${formatHours(ageHours)} en «${lead.status}»; supera el SLA de ${sla} h (+5 por urgencia)`); }

  if (lead.status === "Ganado") { score = 100; reasons.length = 0; reasons.push("Oportunidad ganada"); }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const slaLabel = sla === null ? "Cerrado" : stale ? `Atrasado · SLA ${sla} h` : `Dentro del SLA de ${sla} h`;
  const summary = summarize(lead, intents, sentiment);
  return { score, reasons, intents, sentiment, sentimentEvidence, awaitingReply, ageHours, stale, slaLabel, summary };
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} días`;
}

function summarize(lead: Lead, intents: Intent[], sentiment: Sentiment): string {
  const what = intents.length ? intents.map(i => i.label.toLowerCase()).join(", ") : "consulta general";
  const turns = lead.messages.length;
  const tone = sentiment === "en riesgo" ? " Hay señales de insatisfacción: conviene que responda una persona." : "";
  return `${lead.name} escribió por ${lead.channel}. Interés: ${what}. ${turns} mensajes en el historial; etapa actual «${lead.status}».${tone}`;
}

// ───────────────────────── Equipo y asignación ─────────────────────────

export type Seller = { id: string; name: string; skills: Industry[] };
/** Equipo ficticio del DEMO. En producción vendría de la tabla de usuarios y roles. */
export const SELLERS: Seller[] = [
  { id: "s1", name: "Carla Ortiz (ficticia)", skills: ["dealer"] },
  { id: "s2", name: "José Rivera (ficticio)", skills: ["dealer", "restaurant"] },
  { id: "s3", name: "Ana Santiago (ficticia)", skills: ["optica", "restaurant"] },
];

/** Asignación por habilidad y menor carga; empata por orden fijo (determinista). */
export function assignSeller(lead: Lead, assignments: Record<string, string>): Seller {
  const load = new Map<string, number>();
  for (const sellerId of Object.values(assignments)) load.set(sellerId, (load.get(sellerId) ?? 0) + 1);
  const current = assignments[lead.id];
  const existing = SELLERS.find(s => s.id === current);
  if (existing) return existing;
  const candidates = SELLERS.filter(s => s.skills.includes(lead.industry));
  const pool = candidates.length ? candidates : SELLERS;
  return [...pool].sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0];
}

// ───────────────────────── Política de autonomía ─────────────────────────

export type AutonomyMode = "asistir" | "supervisado" | "autonomo";
export type ActionKind =
  | "clasificar" | "crear_oportunidad" | "asignar_vendedor" | "programar_seguimiento"
  | "borrador_respuesta" | "transferir_humano" | "avanzar_etapa"
  | "enviar_mensaje" | "confirmar_cita" | "cobrar";
export type Decision = "ejecutada" | "requiere_aprobacion" | "bloqueada";

/** internal: solo cambia datos del CRM. external: llega al cliente o a terceros. forbidden: nunca en el DEMO. */
export const ACTION_RISK: Record<ActionKind, "internal" | "approval" | "external" | "forbidden"> = {
  clasificar: "internal", crear_oportunidad: "internal", asignar_vendedor: "internal",
  programar_seguimiento: "internal", transferir_humano: "internal",
  avanzar_etapa: "approval", borrador_respuesta: "approval",
  enviar_mensaje: "external", confirmar_cita: "external", cobrar: "forbidden",
};

export const MODE_LABEL: Record<AutonomyMode, string> = {
  asistir: "Asistir — Axira propone, una persona aprueba todo",
  supervisado: "Supervisado — Axira ejecuta tareas internas; lo demás espera aprobación",
  autonomo: "Autonomía controlada — Axira ejecuta y avanza etapas; lo externo sigue bloqueado sin integración y consentimiento",
};

export function decide(kind: ActionKind, mode: AutonomyMode, stepNeedsApproval: boolean): { decision: Decision; reason: string } {
  const risk = ACTION_RISK[kind];
  if (risk === "forbidden") return { decision: "bloqueada", reason: "Cobros prohibidos para Axira; solo una persona autorizada puede cobrar." };
  if (risk === "external") return { decision: "bloqueada", reason: "Acción externa: el DEMO no tiene canal real conectado ni consentimiento registrado. Nunca se envía." };
  if (mode === "asistir" || stepNeedsApproval) return { decision: "requiere_aprobacion", reason: mode === "asistir" ? "Modo Asistir: toda acción espera aprobación humana." : "El flujo exige aprobación humana en este paso." };
  if (risk === "approval" && mode !== "autonomo") return { decision: "requiere_aprobacion", reason: "Cambia la etapa o prepara un texto para el cliente; en modo Supervisado lo aprueba una persona." };
  return { decision: "ejecutada", reason: risk === "approval" ? "Autonomía controlada permite este paso interno." : "Tarea interna permitida por la política." };
}

// ───────────────────────── Flujo configurable (constructor visual) ─────────────────────────

export type PlaybookStep = { kind: ActionKind; label: string; enabled: boolean; requireApproval: boolean };
export type Playbook = { trigger: string; steps: PlaybookStep[] };

export function defaultPlaybook(): Playbook {
  return {
    trigger: "Cuando entra un prospecto o un cliente escribe",
    steps: [
      { kind: "clasificar", label: "Axira clasifica intención, sentimiento y puntuación", enabled: true, requireApproval: false },
      { kind: "crear_oportunidad", label: "Se crea o actualiza la oportunidad", enabled: true, requireApproval: false },
      { kind: "asignar_vendedor", label: "Se asigna vendedor por especialidad y carga", enabled: true, requireApproval: false },
      { kind: "programar_seguimiento", label: "Se programa el seguimiento según el SLA", enabled: true, requireApproval: false },
      { kind: "borrador_respuesta", label: "Axira prepara la respuesta sugerida", enabled: true, requireApproval: true },
      { kind: "transferir_humano", label: "Si hay riesgo o pide persona, se transfiere con resumen", enabled: true, requireApproval: false },
      { kind: "avanzar_etapa", label: "Se propone avanzar la etapa del embudo", enabled: true, requireApproval: true },
      { kind: "enviar_mensaje", label: "Enviar respuesta al cliente por su canal", enabled: false, requireApproval: true },
    ],
  };
}

export function sanitizePlaybook(value: unknown): Playbook {
  const base = defaultPlaybook();
  if (!value || typeof value !== "object" || !Array.isArray((value as Playbook).steps)) return base;
  const saved = (value as Playbook).steps;
  return {
    trigger: base.trigger,
    steps: base.steps.map(step => {
      const match = saved.find(s => s && s.kind === step.kind);
      // Un texto dirigido al cliente siempre lo aprueba una persona, aunque se edite el flujo guardado.
      return match ? { ...step, enabled: !!match.enabled, requireApproval: step.kind === "borrador_respuesta" ? true : !!match.requireApproval } : step;
    }),
  };
}

// ───────────────────────── Plan de acciones ─────────────────────────

export type ProposedAction = {
  id: string; leadId: string; kind: ActionKind; title: string; detail: string;
  decision: Decision; reason: string; payload?: { status?: LeadStatus; sellerId?: string; draft?: string; dueAt?: string };
};

export function nextStatus(status: LeadStatus): LeadStatus | null {
  const i = STATUS_ORDER.indexOf(status);
  return i >= 0 && i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
}

export function draftReply(lead: Lead, analysis: LeadAnalysis): string {
  const first = lead.name.replace(/\s*\(fictici[oa]\)\s*/i, "").split(" ")[0] || "";
  const hello = first ? `Hola ${first}, ` : "Hola, ";
  if (analysis.sentiment === "en riesgo") return `${hello}lamentamos la espera. Una persona de nuestro equipo revisará tu caso y te contactará directamente.`;
  const keys = new Set(analysis.intents.map(i => i.key));
  if (lead.industry === "dealer") {
    if (keys.has("financiamiento") && keys.has("prueba")) return `${hello}ya tenemos tu interés en prueba de manejo y financiamiento. ¿Qué día y hora te funciona para que un asesor lo coordine?`;
    if (keys.has("financiamiento")) return `${hello}un asesor revisará contigo las opciones de financiamiento y sus requisitos. ¿Prefieres que te llamemos o seguimos por aquí?`;
    return `${hello}¿qué modelo te interesa y qué día te funciona para que un asesor te atienda?`;
  }
  if (lead.industry === "restaurant") {
    if (keys.has("cambio")) return `${hello}recibimos tu solicitud de cambio. El restaurante revisará la disponibilidad y te confirmará.`;
    return `${hello}recibimos tu solicitud. El restaurante confirmará la disponibilidad antes de dar la reserva por hecha. ¿Alguna preferencia de área o celebración especial?`;
  }
  return `${hello}recibimos tu solicitud de cita. La óptica te confirmará día y hora disponibles. ¿Prefieres mañana o tarde?`;
}

/** Evita duplicar una respuesta igual a otra ya escrita por Axira o ya aprobada. */
export function isDuplicateReply(lead: Lead, draft: string, approvedDrafts: string[] = []): boolean {
  const key = normalize(draft).replace(/\s+/g, " ").trim();
  return lead.messages.some(m => m.by === "axira" && normalize(m.text).replace(/\s+/g, " ").trim() === key)
    || approvedDrafts.some(d => normalize(d).replace(/\s+/g, " ").trim() === key);
}

export function followUpDue(lead: Lead, now: number): string {
  const sla = SLA_HOURS[lead.status] ?? 24;
  return new Date(now + Math.max(1, sla) * HOUR).toISOString();
}

export function planActions(input: {
  lead: Lead; analysis: LeadAnalysis; playbook: Playbook; mode: AutonomyMode;
  seller: Seller; now: number; approvedDrafts?: string[];
}): ProposedAction[] {
  const { lead, analysis, playbook, mode, seller, now } = input;
  if (lead.status === "Ganado") return [];
  const out: ProposedAction[] = [];
  const add = (kind: ActionKind, title: string, detail: string, payload?: ProposedAction["payload"]) => {
    const step = playbook.steps.find(s => s.kind === kind);
    if (!step || !step.enabled) return;
    const { decision, reason } = decide(kind, mode, step.requireApproval);
    // El id incluye la etapa destino: aprobar «Contactar» no oculta la propuesta posterior de «Cita solicitada».
    out.push({ id: `${lead.id}:${kind}:${payload?.status ?? ""}`, leadId: lead.id, kind, title, detail, decision, reason, payload });
  };

  add("clasificar", "Clasificar prospecto", `Puntuación ${analysis.score}/100 · ${analysis.intents.map(i => i.label).join(", ") || "sin intención clara"} · tono ${analysis.sentiment}`);
  add("crear_oportunidad", "Registrar oportunidad", `Oportunidad de ${lead.industry === "dealer" ? "venta de vehículo" : lead.industry === "restaurant" ? "reservación" : "cita de óptica"} en etapa «${lead.status}»`);
  add("asignar_vendedor", "Asignar responsable", `${seller.name} · especialidad y menor carga`, { sellerId: seller.id });
  const due = followUpDue(lead, now);
  add("programar_seguimiento", analysis.stale ? "Rescatar prospecto olvidado" : "Programar seguimiento",
    analysis.stale ? `Superó el SLA (${analysis.slaLabel}). Tarea urgente para ${seller.name}.` : `Revisar antes de ${new Intl.DateTimeFormat("es-PR", { timeZone: "America/Puerto_Rico", dateStyle: "short", timeStyle: "short" }).format(new Date(due))}`,
    { dueAt: due });

  if (analysis.awaitingReply || analysis.stale) {
    const draft = draftReply(lead, analysis);
    if (!isDuplicateReply(lead, draft, input.approvedDrafts)) add("borrador_respuesta", "Respuesta sugerida", draft, { draft });
  }
  const wantsHuman = analysis.intents.some(i => i.key === "llamada");
  if (analysis.sentiment === "en riesgo" || wantsHuman || analysis.score >= 70) {
    add("transferir_humano", "Transferir a vendedor con contexto", `Resumen para ${seller.name}: ${analysis.summary}`, { sellerId: seller.id });
  }
  const proposed = suggestedStage(lead, analysis);
  if (proposed) add("avanzar_etapa", `Avanzar a «${proposed}»`, stageReason(lead, proposed), { status: proposed });
  add("enviar_mensaje", "Enviar respuesta por " + lead.channel, "Requiere canal real, plantilla aprobada y consentimiento del cliente.");
  return out;
}

export function suggestedStage(lead: Lead, analysis: LeadAnalysis): LeadStatus | null {
  if (lead.status === "Nuevo") return "Contactar";
  if (lead.status === "Contactar" && analysis.intents.some(i => ["cita", "reserva", "prueba"].includes(i.key))) return "Cita solicitada";
  return null; // «Ganado» siempre lo decide una persona
}
function stageReason(lead: Lead, to: LeadStatus): string {
  return to === "Contactar" ? "El prospecto ya dio nombre y contacto; el siguiente paso es contactarlo."
    : `Pidió ${lead.industry === "restaurant" ? "reservación" : lead.industry === "dealer" ? "prueba de manejo" : "cita"}; pasa a cita solicitada (sin confirmarla).`;
}

// ───────────────────────── Búsqueda e inteligencia comercial ─────────────────────────

export function searchLeads(leads: Lead[], query: string): Lead[] {
  const q = normalize(query.trim());
  if (!q) return leads;
  return leads.filter(l => normalize([l.name, l.contact, l.need, l.channel, l.status, l.nextAction, ...l.messages.map(m => m.text)].join(" ")).includes(q));
}

export type Metrics = {
  total: number;
  byStatus: Array<{ status: LeadStatus; count: number }>;
  byChannel: Array<{ channel: string; total: number; won: number; rate: number }>;
  awaitingReply: number;
  stale: number;
  atRisk: number;
  avgScore: number;
  sellerLoad: Array<{ seller: Seller; open: number }>;
};

export function pipelineMetrics(leads: Lead[], now: number, assignments: Record<string, string>): Metrics {
  const analyses = leads.map(l => ({ lead: l, a: analyzeLead(l, now) }));
  const channels = new Map<string, { total: number; won: number }>();
  for (const { lead } of analyses) {
    const c = channels.get(lead.channel) ?? { total: 0, won: 0 };
    c.total++; if (lead.status === "Ganado") c.won++;
    channels.set(lead.channel, c);
  }
  const open = analyses.filter(x => x.lead.status !== "Ganado");
  const sellerLoad = SELLERS.map(seller => ({ seller, open: open.filter(x => assignments[x.lead.id] === seller.id).length }));
  return {
    total: leads.length,
    byStatus: STATUS_ORDER.map(status => ({ status, count: leads.filter(l => l.status === status).length })),
    byChannel: [...channels.entries()].map(([channel, c]) => ({ channel, ...c, rate: c.total ? c.won / c.total : 0 })).sort((a, b) => b.total - a.total),
    awaitingReply: analyses.filter(x => x.a.awaitingReply).length,
    stale: analyses.filter(x => x.a.stale).length,
    atRisk: analyses.filter(x => x.a.sentiment === "en riesgo").length,
    avgScore: open.length ? Math.round(open.reduce((s, x) => s + x.a.score, 0) / open.length) : 0,
    sellerLoad,
  };
}

// ───────────────────────── Registro de auditoría ─────────────────────────

export type AuditEntry = {
  id: string; at: string; leadId: string; leadName: string; kind: ActionKind;
  title: string; detail: string; outcome: "ejecutada" | "aprobada" | "descartada" | "bloqueada" | "error";
  by: "Axira" | "Persona"; persisted: "Neon QA" | "Este navegador"; actionKey?: string;
};

export function productivity(log: AuditEntry[]) {
  return {
    executed: log.filter(e => e.outcome === "ejecutada").length,
    approved: log.filter(e => e.outcome === "aprobada").length,
    discarded: log.filter(e => e.outcome === "descartada").length,
    blocked: log.filter(e => e.outcome === "bloqueada").length,
    leadsTouched: new Set(log.map(e => e.leadId)).size,
  };
}
