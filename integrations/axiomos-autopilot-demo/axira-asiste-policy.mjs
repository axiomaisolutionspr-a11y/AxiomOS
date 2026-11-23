/**
 * Axira Asiste para el DEMO estático AxiomOS Autopilot.
 * Lógica pura para muestra sintética. Sin red, credenciales, webhooks ni modificaciones de datos.
 */
export const DEMO_SECTORS = Object.freeze(["dealer", "restaurante", "optica", "servicios"]);
export const DEMO_LIMITS = Object.freeze({ businessFacts: 1800, message: 700, history: 10, reply: 900 });

const hasNonDemoContact = text => {
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text)) return true;
  const phones = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  return phones.some(phone => !/^1?78755501\d{2}$/.test(phone.replace(/\D/g, "")));
};
const safeText = (text, max) => typeof text === "string" && text.trim() && text.length <= max
  ? text.trim() : null;

export function validateDemoConversation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Datos de demo incorrectos." };
  if (!DEMO_SECTORS.includes(input.sector)) return { ok: false, error: "Sector de demo no permitido." };
  const facts = safeText(input.businessFacts, DEMO_LIMITS.businessFacts);
  if (!facts || hasNonDemoContact(facts)) return { ok: false, error: "Utiliza únicamente información ficticia del negocio." };
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > DEMO_LIMITS.history) {
    return { ok: false, error: "Introduce entre 1 y 10 mensajes de prueba." };
  }
  const messages = [];
  for (const m of input.messages) {
    const text = safeText(m?.text, DEMO_LIMITS.message);
    if (!text || !["cliente", "negocio"].includes(m?.by) || hasNonDemoContact(text)) {
      return { ok: false, error: "Hay mensajes inválidos o información de contacto real." };
    }
    messages.push({ by: m.by, text });
  }
  if (!messages.some(m => m.by === "cliente")) return { ok: false, error: "Falta un mensaje del cliente." };
  return { ok: true, value: { sector: input.sector, businessFacts: facts, messages } };
}

export function safeDemoSuggestions(input) {
  const checked = validateDemoConversation(input);
  if (!checked.ok) return checked;
  const { messages } = checked.value;
  const lastClient = [...messages].reverse().find(m => m.by === "cliente")?.text || "";
  const lastBy = messages.at(-1).by;
  const optedOut = /(?:no me (?:escriban|llamen|contacten)|no (?:quiero|deseo) (?:más )?mensajes|stop|unsubscribe|baja)/i.test(lastClient);
  const price = /(?:precio|cu[aá]nto|cuesta|cost[oae]|descuento|caro|financiamiento)/i.test(lastClient);
  const booking = /(?:cita|reserv[aa]|disponib|horario|mesa)/i.test(lastClient);
  const complaint = /(?:molest|queja|problema|nadie me|tarde|reclamo)/i.test(lastClient);
  const lastAnswered = lastBy === "negocio";

  const intent = optedOut ? "El cliente pidió no recibir más comunicaciones"
    : price ? "Consulta económica pendiente de verificar"
    : booking ? "Interés en cita, reservación u horario"
    : complaint ? "Cliente necesita una solución o atención humana"
    : "Consulta comercial para aclarar";
  const risk = optedOut ? "No enviar más mensajes promocionales ni seguimientos. Registrar la baja mediante el proceso autorizado."
    : "Estos textos son muestras, no mensajes enviados. Verificar datos, autorización del cliente y reglas del canal.";
  const quick = optedOut ? "Entendido. Respetaremos tu solicitud de no recibir más comunicaciones."
    : lastAnswered ? "Ya te compartimos una respuesta. Si necesitas aclarar algo, estamos disponibles."
    : price ? "Con gusto te orientamos. Un asesor puede confirmar el precio y las condiciones vigentes."
    : booking ? "Con gusto. Podemos revisar tu solicitud, pero el equipo debe confirmar disponibilidad."
    : complaint ? "Lamentamos lo ocurrido. Permítenos revisar tu situación con el equipo encargado."
    : "¡Saludos! Con gusto te ayudamos. ¿Qué información adicional necesitas?";
  const empathetic = optedOut ? quick
    : lastAnswered ? "Gracias por conversar con nosotros. Si queda alguna pregunta, con gusto la revisamos."
    : price ? "Entendemos que el precio es importante. Queremos darte información correcta, así que verificaremos las opciones disponibles."
    : booking ? "¡Será un gusto ayudarte! Déjanos confirmar la disponibilidad antes de darte una respuesta definitiva."
    : complaint ? "Entendemos tu molestia y queremos atender tu situación con cuidado. Vamos a recomendar que te asista una persona del equipo."
    : "Gracias por escribirnos. Será un placer ayudarte a conocer las opciones.";
  const commercial = optedOut ? quick
    : lastAnswered ? "Quedamos pendientes por si deseas aclarar algún detalle antes de decidir."
    : price ? "Podemos explicarte las alternativas y solicitar al equipo una cotización confirmada. ¿Cuál servicio te interesa?"
    : booking ? "Podemos consultar las opciones disponibles con el equipo. ¿Qué día prefieres?"
    : complaint ? "Queremos resolver esta situación antes de ofrecerte otra alternativa. Recomendamos atención humana."
    : "Con gusto te orientamos para elegir la alternativa adecuada. ¿Qué objetivo deseas lograr?";
  return { ok: true, mode: "simulacion_sin_ia", sent: false, saved: false, result: {
    intent,
    reason: lastAnswered ? "El último mensaje fue del negocio; evitar respuestas repetidas."
      : "Recomendación determinista de ejemplo basada en el mensaje de prueba.",
    threadSummary: "Intercambio ficticio de " + messages.length + " mensaje(s). Revisar el contexto completo antes de usar un borrador.",
    nextAction: optedOut ? "Respetar baja y no generar seguimiento comercial."
      : lastAnswered ? "Esperar al cliente antes de insistir."
      : "Revisar el historial y decidir si corresponde responder o escalar.",
    risk, answers: { quick, empathetic, commercial },
  } };
}

export function validateSuggestionOutput(output) {
  const r = output?.result;
  if (!output || output.sent !== false || output.saved !== false || !r || typeof r !== "object") return null;
  const keys = ["intent", "reason", "threadSummary", "nextAction", "risk"];
  const answerKeys = ["quick", "empathetic", "commercial"];
  if (keys.some(k => !safeText(r[k], 700)) || answerKeys.some(k => !safeText(r.answers?.[k], DEMO_LIMITS.reply))) return null;
  return { ...r, answers: Object.fromEntries(answerKeys.map(k => [k, r.answers[k].trim()])) };
}
