// Datos y textos del recorrido de demostración de AxiomOS Autopilot.
// TODO lo de este archivo es ficticio: nombres, teléfonos, conversaciones y llamadas son de ejemplo.
// Ninguna acción del recorrido envía mensajes, hace llamadas ni modifica la base de datos.
import type { Lang } from "../i18n";

export type Channel = "whatsapp" | "messenger" | "instagram" | "web";
export type Stage = "nuevo" | "interesado" | "seguimiento" | "cliente" | "perdido";
type L = { es: string; en: string };

export type DemoProspect = {
  id: string; name: string; business: L; channel: Channel; stage: Stage; owner: string | null;
  phoneLast4: string; consent: boolean; value: number; note: L;
};
export type DemoMessage = { from: "client" | "axira" | "agent"; text: L; at: string };
export type DemoConversation = { prospectId: string; unread: number; messages: DemoMessage[] };
export type DemoFollowup = { id: string; prospectId: string; dueInHours: number; task: L; done: boolean };
export type DemoCall = { id: string; prospectId: string; minutes: number; direction: "in" | "out"; summary: L; at: string };

export const STAGES: Stage[] = ["nuevo", "interesado", "seguimiento", "cliente", "perdido"];

export const PROSPECTS: DemoProspect[] = [
  { id: "p1", name: "Marisol Rivera (demo)", business: { es: "Panadería La Esquina", en: "La Esquina Bakery" }, channel: "whatsapp", stage: "nuevo", owner: null, phoneLast4: "0101", consent: true, value: 17.95, note: { es: "Preguntó por el precio del plan.", en: "Asked about the plan price." } },
  { id: "p2", name: "Carlos Méndez (demo)", business: { es: "Taller Méndez Auto", en: "Méndez Auto Shop" }, channel: "messenger", stage: "interesado", owner: "Rolando", phoneLast4: "0202", consent: true, value: 17.95, note: { es: "Quiere automatizar recordatorios de citas.", en: "Wants to automate appointment reminders." } },
  { id: "p3", name: "Ana Torres (demo)", business: { es: "Clínica Dental Sonrisa", en: "Sonrisa Dental Clinic" }, channel: "instagram", stage: "seguimiento", owner: "Rolando", phoneLast4: "0303", consent: true, value: 17.95, note: { es: "Pidió cotización de Recepcionista de IA.", en: "Requested an AI Receptionist quote." } },
  { id: "p4", name: "José Ortiz (demo)", business: { es: "Ortiz Bienes Raíces", en: "Ortiz Real Estate" }, channel: "web", stage: "cliente", owner: "Rolando", phoneLast4: "0404", consent: true, value: 17.95, note: { es: "Cliente desde la demostración anterior.", en: "Client since the previous demo." } },
  { id: "p5", name: "Luz Santiago (demo)", business: { es: "Floristería Luz", en: "Luz Flower Shop" }, channel: "whatsapp", stage: "interesado", owner: null, phoneLast4: "0505", consent: false, value: 17.95, note: { es: "Pidió no recibir promociones.", en: "Asked not to receive promotions." } },
  { id: "p6", name: "Pedro Colón (demo)", business: { es: "Colón Plomería", en: "Colón Plumbing" }, channel: "messenger", stage: "perdido", owner: "Rolando", phoneLast4: "0606", consent: true, value: 0, note: { es: "Eligió otra opción por ahora.", en: "Chose another option for now." } },
];

export const CONVERSATIONS: DemoConversation[] = [
  { prospectId: "p1", unread: 1, messages: [
    { from: "client", text: { es: "Hola, ¿cuánto cuesta el CRM?", en: "Hi, how much is the CRM?" }, at: "9:12" },
  ] },
  { prospectId: "p2", unread: 1, messages: [
    { from: "client", text: { es: "Buenas. ¿Pueden integrar el sistema con mi agenda de citas?", en: "Hello. Can you integrate the system with my appointment calendar?" }, at: "8:40" },
  ] },
  { prospectId: "p3", unread: 0, messages: [
    { from: "client", text: { es: "Me interesa la Recepcionista de IA para la clínica.", en: "I'm interested in the AI Receptionist for the clinic." }, at: "Ayer" },
    { from: "axira", text: { es: "¡Gracias, Ana! La Recepcionista de IA se cotiza según el volumen de llamadas. ¿Quieres que un asesor te contacte?", en: "Thanks, Ana! The AI Receptionist is quoted based on call volume. Would you like an advisor to contact you?" }, at: "Ayer" },
    { from: "client", text: { es: "Sí, quiero hablar con una persona.", en: "Yes, I want to talk to a person." }, at: "Ayer" },
  ] },
  { prospectId: "p4", unread: 0, messages: [
    { from: "client", text: { es: "¿Me pueden atender en inglés? Soy de Puerto Rico.", en: "Can you help me in English? I am in Puerto Rico." }, at: "Lun" },
  ] },
  { prospectId: "p5", unread: 1, messages: [
    { from: "client", text: { es: "Hola, ¿tienen horario los sábados?", en: "Hi, are you open on Saturdays?" }, at: "10:05" },
  ] },
  { prospectId: "p6", unread: 0, messages: [
    { from: "client", text: { es: "Gracias, por ahora vamos a esperar.", en: "Thanks, we'll wait for now." }, at: "Mar" },
    { from: "agent", text: { es: "Entendido, Pedro. Aquí estamos cuando lo necesites.", en: "Understood, Pedro. We're here whenever you need us." }, at: "Mar" },
  ] },
];

// Lo que el cliente ficticio contesta, en orden, cuando le respondes en la demostración.
export const CLIENT_REPLIES: Record<string, L[]> = {
  p1: [
    { es: "¿Y qué incluye ese precio?", en: "And what does that price include?" },
    { es: "Perfecto. ¿Cómo lo activo?", en: "Perfect. How do I activate it?" },
    { es: "Gracias, mañana te confirmo.", en: "Thanks, I'll confirm tomorrow." },
  ],
  p2: [
    { es: "Uso Google Calendar. ¿Sirve?", en: "I use Google Calendar. Does that work?" },
    { es: "Bien. ¿Me pueden llamar mañana en la mañana?", en: "Good. Can you call me tomorrow morning?" },
  ],
  p3: [
    { es: "Recibo como 40 llamadas al día.", en: "I get about 40 calls a day." },
    { es: "Perfecto, espero la llamada del asesor.", en: "Perfect, I'll wait for the advisor's call." },
  ],
  p4: [
    { es: "Great, thank you! Everything is working well.", en: "Great, thank you! Everything is working well." },
  ],
  p5: [
    { es: "Ok, gracias. ¿Y cuánto cuesta el plan?", en: "Ok, thanks. And how much is the plan?" },
    { es: "Lo voy a pensar. Gracias.", en: "I'll think about it. Thanks." },
  ],
  p6: [
    { es: "Gracias, los tendré en cuenta.", en: "Thanks, I'll keep you in mind." },
  ],
};

export const FOLLOWUPS: DemoFollowup[] = [
  { id: "f1", prospectId: "p3", dueInHours: -20, task: { es: "Llamar para cotizar Recepcionista de IA", en: "Call to quote the AI Receptionist" }, done: false },
  { id: "f2", prospectId: "p2", dueInHours: 3, task: { es: "Enviar información de integraciones", en: "Send integrations information" }, done: false },
  { id: "f3", prospectId: "p1", dueInHours: 26, task: { es: "Confirmar si desea la promoción de 3 meses", en: "Confirm whether they want the 3-month promotion" }, done: false },
  { id: "f4", prospectId: "p4", dueInHours: 120, task: { es: "Revisar satisfacción del primer mes", en: "Check first-month satisfaction" }, done: false },
];

export const CALLS: DemoCall[] = [
  { id: "c1", prospectId: "p3", minutes: 6, direction: "in", at: "Ayer 3:15 PM", summary: { es: "Preguntó por horarios de atención y la Recepcionista de IA. Pidió hablar con un asesor.", en: "Asked about business hours and the AI Receptionist. Requested an advisor." } },
  { id: "c2", prospectId: "p2", minutes: 4, direction: "out", at: "Ayer 11:02 AM", summary: { es: "Se le explicó cómo funcionan los recordatorios automáticos. Interesado.", en: "Automatic reminders were explained. Interested." } },
  { id: "c3", prospectId: "p4", minutes: 9, direction: "in", at: "Lun 10:30 AM", summary: { es: "Activación del plan y dudas sobre usuarios incluidos.", en: "Plan activation and questions about included users." } },
];

export const DEMO_TEXT = {
  es: {
    badge: "DATOS DE DEMOSTRACIÓN",
    title: "Recorrido de AxiomOS Autopilot",
    intro: "Explora cómo funcionaría el CRM terminado con datos de ejemplo. Nada de lo que hagas aquí envía mensajes, hace llamadas ni cambia información real.",
    realPrices: "Las respuestas de precios de Axira usan el catálogo real publicado en el Centro Comercial.",
    reset: "Reiniciar demostración",
    next: "Siguiente →", prev: "← Anterior", step: "Paso",
    sections: { inicio: "Inicio", conversaciones: "Conversaciones", prospectos: "Prospectos", seguimientos: "Seguimientos", llamadas: "Llamadas", campanas: "Campañas", panel: "Panel de ventas", brain: "Brain", actividad: "Actividad" },
    tour: [
      ["Conversaciones", "Todos los mensajes de WhatsApp, Messenger, Instagram y la web llegan a una sola bandeja. Axira sugiere la respuesta y tú decides."],
      ["Prospectos", "Cada contacto queda organizado por etapa. Mueve un prospecto y verás cómo cambia el panel de ventas."],
      ["Seguimientos", "El sistema te avisa de quién no ha recibido seguimiento y qué está vencido."],
      ["Llamadas", "Las llamadas quedan registradas con un resumen y el consumo de minutos del plan."],
      ["Campañas", "Prepara promociones solo para quienes dieron consentimiento; las bajas se excluyen solas."],
      ["Panel de ventas", "Ves en un vistazo cómo va el negocio, con cifras que se actualizan según lo que hagas."],
      ["Brain", "Tu asistente de negocio: pregúntale cómo van tus ventas. Cada plan trae preguntas al mes y puedes añadir más."],
    ] as Array<[string, string]>,
    startTour: "Empezar recorrido", go: "Ir",
    channels: { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" } as Record<string, string>,
    stages: { nuevo: "Nuevo", interesado: "Interesado", seguimiento: "En seguimiento", cliente: "Cliente", perdido: "Perdido" } as Record<string, string>,
    inbox: "Bandeja unificada", unread: "sin leer", selectConversation: "Elige una conversación",
    axiraSuggests: "Axira sugiere", suggestionFromCatalog: "Basado en el catálogo publicado", suggestionFromKnowledge: "Basado en un conocimiento aprobado",
    suggestionHandoff: "Axira propone pasar la conversación a un asesor.", handoffReply: "Con gusto te comunico con un asesor de AxiomAI Solutions. Te contactará pronto.",
    noSuggestion: "Axira no tiene una respuesta aprobada para esto; propondría transferir a un asesor.",
    approveSend: "Aprobar respuesta (demostración)", transfer: "Transferir a asesor", writeReply: "Escribe tu respuesta…", sendOwn: "Responder (demostración)",
    notSent: "Demostración: este mensaje no se envió a nadie.", transferred: "Transferido a asesor", you: "Tú", client: "Cliente",
    owner: "Responsable", unassigned: "Sin asignar", assignMe: "Asignarme", moveBack: "← Etapa anterior", moveNext: "Etapa siguiente →",
    consentYes: "Acepta promociones", consentNo: "Baja de promociones",
    due: "Vence", overdue: "Vencido", inHours: (h: number) => { const d = Math.round(h / 24); return h < 24 ? `en ${h} h` : `en ${d} ${d === 1 ? "día" : "días"}`; }, agoHours: (h: number) => `hace ${Math.abs(h)} h`,
    markDone: "Marcar hecho", postpone: "Posponer 1 día", done: "Hecho", pendingFollowups: "pendientes", overdueCount: "vencidos",
    minutesUsed: "Minutos usados (demo)", ofPlan: "de 200 incluidos", callIn: "Entrante", callOut: "Saliente", min: "min",
    callNote: "En el CRM terminado las llamadas pasan por la línea del negocio. Aquí solo se muestran ejemplos.",
    campaignName: "Nombre de la campaña", campaignMsg: "Mensaje", segment: "Enviar a", segmentAll: "Todos los prospectos",
    segmentStage: "Etapa", recipients: "Recibirían el mensaje", excludedOptOut: "excluidos por baja", schedule: "Programar (demostración)",
    scheduled: "Campaña guardada solo en la demostración. No se envió ningún mensaje.",
    campaignNote: "En el CRM terminado las campañas usan plantillas aprobadas por WhatsApp y requieren tu aprobación final.",
    defaultCampaign: "Promoción AxiomOS Autopilot", defaultCampaignMsg: "Hola {nombre}, este mes AxiomOS Autopilot está a $9.99 los primeros 3 meses.",
    kpiProspects: "Prospectos", kpiClients: "Clientes", kpiConversion: "Conversión", kpiMonthly: "Ingreso mensual (demo)", kpiOverdue: "Seguimientos vencidos", kpiUnread: "Mensajes sin leer",
    byStage: "Por etapa", activityEmpty: "Todavía no has hecho nada en la demostración.",
    back: "← Conversaciones", openChat: "Abrir conversación", typing: (n: string) => `${n} está escribiendo…`, edit: "Editar",
    actions: "Acciones", call: "Llamar", followup: "Crear seguimiento", nextStage: "Pasar a la siguiente etapa", stage: "Etapa",
    quickReplies: "Respuestas rápidas", quickPrice: "Precios", quickSchedule: "Agendar llamada", quickThanks: "Agradecer",
    quickScheduleText: "¿Qué día y hora te funciona para una llamada de 15 minutos? Te confirmamos enseguida.",
    quickThanksText: "¡Gracias por escribirnos! Cualquier pregunta, aquí estamos.",
    contactInfo: "Ficha del contacto", notes: "Notas", addNote: "Guardar nota", notePlaceholder: "Escribe una nota interna…",
    contactFollowups: "Seguimientos", contactCalls: "Llamadas", none: "Ninguno todavía.",
    optOut: "Marcar baja de promociones", optIn: "Reactivar promociones",
    followupTask: "Dar seguimiento a la conversación",
    callSummary: (n: string) => `Llamada de demostración con ${n}. Axira resumió: el cliente pidió más información y queda pendiente enviarla.`,
    sysCall: (m: number) => `Llamada de ${m} min registrada. Axira hizo el resumen (demostración).`,
    sysFollowup: "Seguimiento creado para mañana (demostración).",
    sysStage: (s: string) => `Etapa cambiada a «${s}».`, sysTransfer: "Conversación transferida a un asesor.",
    sysOptOut: "El contacto quedó dado de baja de promociones. Las campañas lo excluyen.", sysOptIn: "Promociones reactivadas para este contacto.",
    clientDemo: "Respuesta ficticia del cliente (demostración).",
    log: {
      sent: (n: string) => `Respuesta aprobada para ${n} (no enviada).`,
      called: (n: string) => `Llamada de demostración con ${n}.`, followup: (n: string) => `Seguimiento creado para ${n}.`,
      note: (n: string) => `Nota añadida a ${n}.`, optOut: (n: string) => `${n} dado de baja de promociones.`, optIn: (n: string) => `${n} acepta promociones otra vez.`, transferred: (n: string) => `${n} transferido a asesor.`,
      moved: (n: string, s: string) => `${n} pasó a «${s}».`, assigned: (n: string) => `${n} asignado a ti.`,
      done: (t: string) => `Seguimiento hecho: ${t}.`, postponed: (t: string) => `Seguimiento pospuesto: ${t}.`,
      campaign: (c: string, r: number) => `Campaña «${c}» preparada para ${r} contactos (no enviada).`, reset: "Demostración reiniciada.",
    },
    brain: {
      intro: "Pregúntale a Brain por tus ventas, planes o cómo usar el CRM. En esta demostración tienes 5 preguntas para ver qué pasa al llegar al límite.",
      meter: (l: number, n: number) => `${l === 1 ? "Te queda" : "Te quedan"} ${l.toLocaleString("es-PR")} de ${n.toLocaleString("es-PR")} preguntas (demostración)`, placeholder: "Escribe tu pregunta…", send: "Preguntar",
      blocked: "Llegaste al límite de la demostración. Así se ve cuando se acaban las preguntas del mes:",
      pack: (q: string, p: string) => `Añadir ${q} preguntas por ${p} al mes`, addPack: "Añadir paquete (demostración, sin cobro)",
      packAdded: "Paquete añadido en la demostración.", free: "No se contó",
      suggestions: ["¿Cómo van mis prospectos?", "¿Cuánto cuesta el plan Pro?", "¿Cuántas preguntas a Brain me quedan?"],
    },
    integration: "Requiere integración", connected: "Funciona en esta versión",
    statusTitle: "Qué funciona ya y qué depende de una integración",
    status: [
      ["Centro Comercial (planes, servicios, conocimientos, versiones, auditoría)", true],
      ["Respuestas de precios de Axira desde el catálogo publicado", true],
      ["Registro de bajas de WhatsApp (en la base de prueba)", true],
      ["Bandeja unificada con mensajes reales de WhatsApp, Messenger e Instagram", false],
      ["Envío real de respuestas y campañas", false],
      ["Registro real de llamadas y minutos", false],
      ["Brain: preguntas con límite mensual y paquete adicional (en la versión de prueba)", true],
      ["Brain con IA para preguntas abiertas", false],
      ["Contador automático de los demás límites del plan", false],
    ] as Array<[string, boolean]>,
  },
  en: {
    badge: "DEMO DATA",
    title: "AxiomOS Autopilot tour",
    intro: "Explore how the finished CRM would work with sample data. Nothing you do here sends messages, places calls or changes real information.",
    realPrices: "Axira's price answers use the real catalog published in the Commercial Center.",
    reset: "Reset demo",
    next: "Next →", prev: "← Back", step: "Step",
    sections: { inicio: "Start", conversaciones: "Conversations", prospectos: "Prospects", seguimientos: "Follow-ups", llamadas: "Calls", campanas: "Campaigns", panel: "Sales dashboard", brain: "Brain", actividad: "Activity" },
    tour: [
      ["Conversations", "Every WhatsApp, Messenger, Instagram and web message arrives in one inbox. Axira suggests the reply and you decide."],
      ["Prospects", "Each contact is organized by stage. Move a prospect and watch the sales dashboard change."],
      ["Follow-ups", "The system tells you who hasn't been followed up and what is overdue."],
      ["Calls", "Calls are logged with a summary and the plan's minute usage."],
      ["Campaigns", "Prepare promotions only for people who consented; opt-outs are excluded automatically."],
      ["Sales dashboard", "See how the business is doing at a glance, with figures that update as you work."],
      ["Brain", "Your business assistant: ask how sales are going. Each plan includes questions per month and you can add more."],
    ] as Array<[string, string]>,
    startTour: "Start tour", go: "Go",
    channels: { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", web: "Web" } as Record<string, string>,
    stages: { nuevo: "New", interesado: "Interested", seguimiento: "Following up", cliente: "Client", perdido: "Lost" } as Record<string, string>,
    inbox: "Unified inbox", unread: "unread", selectConversation: "Choose a conversation",
    axiraSuggests: "Axira suggests", suggestionFromCatalog: "Based on the published catalog", suggestionFromKnowledge: "Based on approved knowledge",
    suggestionHandoff: "Axira proposes handing the conversation to an advisor.", handoffReply: "I'll gladly connect you with an AxiomAI Solutions advisor. They will contact you soon.",
    noSuggestion: "Axira has no approved answer for this; it would propose handing off to an advisor.",
    approveSend: "Approve reply (demo)", transfer: "Hand off to advisor", writeReply: "Write your reply…", sendOwn: "Reply (demo)",
    notSent: "Demo: this message was not sent to anyone.", transferred: "Handed off to advisor", you: "You", client: "Client",
    owner: "Owner", unassigned: "Unassigned", assignMe: "Assign to me", moveBack: "← Previous stage", moveNext: "Next stage →",
    consentYes: "Accepts promotions", consentNo: "Opted out of promotions",
    due: "Due", overdue: "Overdue", inHours: (h: number) => { const d = Math.round(h / 24); return h < 24 ? `in ${h} h` : `in ${d} ${d === 1 ? "day" : "days"}`; }, agoHours: (h: number) => `${Math.abs(h)} h ago`,
    markDone: "Mark done", postpone: "Postpone 1 day", done: "Done", pendingFollowups: "pending", overdueCount: "overdue",
    minutesUsed: "Minutes used (demo)", ofPlan: "of 200 included", callIn: "Inbound", callOut: "Outbound", min: "min",
    callNote: "In the finished CRM calls go through the business line. Only examples are shown here.",
    campaignName: "Campaign name", campaignMsg: "Message", segment: "Send to", segmentAll: "All prospects",
    segmentStage: "Stage", recipients: "Would receive it", excludedOptOut: "excluded (opted out)", schedule: "Schedule (demo)",
    scheduled: "Campaign saved in the demo only. No message was sent.",
    campaignNote: "In the finished CRM campaigns use WhatsApp-approved templates and require your final approval.",
    defaultCampaign: "AxiomOS Autopilot promotion", defaultCampaignMsg: "Hi {nombre}, this month AxiomOS Autopilot is $9.99 for the first 3 months.",
    kpiProspects: "Prospects", kpiClients: "Clients", kpiConversion: "Conversion", kpiMonthly: "Monthly revenue (demo)", kpiOverdue: "Overdue follow-ups", kpiUnread: "Unread messages",
    byStage: "By stage", activityEmpty: "You haven't done anything in the demo yet.",
    back: "← Conversations", openChat: "Open conversation", typing: (n: string) => `${n} is typing…`, edit: "Edit",
    actions: "Actions", call: "Call", followup: "Create follow-up", nextStage: "Move to next stage", stage: "Stage",
    quickReplies: "Quick replies", quickPrice: "Prices", quickSchedule: "Schedule a call", quickThanks: "Thank",
    quickScheduleText: "What day and time works for a 15-minute call? We'll confirm right away.",
    quickThanksText: "Thanks for writing to us! Any questions, we're here.",
    contactInfo: "Contact card", notes: "Notes", addNote: "Save note", notePlaceholder: "Write an internal note…",
    contactFollowups: "Follow-ups", contactCalls: "Calls", none: "None yet.",
    optOut: "Opt out of promotions", optIn: "Re-enable promotions",
    followupTask: "Follow up on the conversation",
    callSummary: (n: string) => `Demo call with ${n}. Axira summarized: the client asked for more information, which is pending.`,
    sysCall: (m: number) => `${m}-min call logged. Axira wrote the summary (demo).`,
    sysFollowup: "Follow-up created for tomorrow (demo).",
    sysStage: (s: string) => `Stage changed to “${s}”.`, sysTransfer: "Conversation handed off to an advisor.",
    sysOptOut: "The contact opted out of promotions. Campaigns exclude them.", sysOptIn: "Promotions re-enabled for this contact.",
    clientDemo: "Fictitious client reply (demo).",
    log: {
      called: (n: string) => `Demo call with ${n}.`, followup: (n: string) => `Follow-up created for ${n}.`,
      note: (n: string) => `Note added to ${n}.`, optOut: (n: string) => `${n} opted out of promotions.`, optIn: (n: string) => `${n} accepts promotions again.`,
      sent: (n: string) => `Reply approved for ${n} (not sent).`, transferred: (n: string) => `${n} handed off to an advisor.`,
      moved: (n: string, s: string) => `${n} moved to “${s}”.`, assigned: (n: string) => `${n} assigned to you.`,
      done: (t: string) => `Follow-up done: ${t}.`, postponed: (t: string) => `Follow-up postponed: ${t}.`,
      campaign: (c: string, r: number) => `Campaign “${c}” prepared for ${r} contacts (not sent).`, reset: "Demo reset.",
    },
    brain: {
      intro: "Ask Brain about your sales, plans or how to use the CRM. In this demo you have 5 questions so you can see what happens at the limit.",
      meter: (l: number, n: number) => `${l.toLocaleString("en-US")} of ${n.toLocaleString("en-US")} questions left (demo)`, placeholder: "Type your question…", send: "Ask",
      blocked: "You reached the demo limit. This is what it looks like when the month's questions run out:",
      pack: (q: string, p: string) => `Add ${q} questions for ${p}/month`, addPack: "Add pack (demo, no charge)",
      packAdded: "Pack added in the demo.", free: "Not counted",
      suggestions: ["How are my prospects doing?", "How much is the Pro plan?", "How many Brain questions do I have left?"],
    },
    integration: "Needs integration", connected: "Works in this version",
    statusTitle: "What works now and what depends on an integration",
    status: [
      ["Commercial Center (plans, services, knowledge, versions, audit)", true],
      ["Axira price answers from the published catalog", true],
      ["WhatsApp opt-out registry (in the test database)", true],
      ["Unified inbox with real WhatsApp, Messenger and Instagram messages", false],
      ["Real sending of replies and campaigns", false],
      ["Real call and minute logging", false],
      ["Brain: questions with a monthly limit and extra pack (in the test version)", true],
      ["Brain with AI for open questions", false],
      ["Automatic counter for the other plan limits", false],
    ] as Array<[string, boolean]>,
  },
};
export type DemoText = typeof DEMO_TEXT.es;
export const demoText = (lang: Lang): DemoText => DEMO_TEXT[lang];
export const pick = (l: L, lang: Lang) => l[lang];
