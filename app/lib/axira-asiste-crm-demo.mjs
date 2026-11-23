// Adaptador sin efectos secundarios: solo datos sintéticos del CRM demo.
const allowedStages = new Set([
  "Nuevo", "Seguimiento", "Contactado", "Interesado", "Cita agendada",
  "Cotización enviada", "Negociación", "Vendido", "Perdido",
]);

export function asisteCrmDemoRequest(contact, businessKnowledge) {
  if (!contact || typeof contact !== "object" ||
      typeof contact.company !== "string" || !contact.company.trim() ||
      contact.company.length > 100 || !contact.company.toLowerCase().includes("demostración")) {
    return { ok: false, error: "Axira solo puede analizar contactos ficticios en esta fase." };
  }
  if (!allowedStages.has(contact.stage) || contact.channel !== "WhatsApp" ||
      !Array.isArray(contact.messages)) {
    return { ok: false, error: "Este contacto no tiene una conversación compatible de prueba." };
  }
  if (typeof businessKnowledge !== "string" || !businessKnowledge.trim() ||
      businessKnowledge.length > 5000) {
    return { ok: false, error: "Completa los datos verificados del negocio demo." };
  }
  const messages = contact.messages.slice(0, 12).reverse();
  if (!messages.length || !messages.at(-1)?.incoming) {
    return { ok: false, error: "No hay un mensaje nuevo del cliente. Espera su respuesta antes de sugerir otro mensaje." };
  }
  if (messages.some(m => !m || typeof m.text !== "string" || !m.text.trim() ||
      m.text.length > 1500 || typeof m.incoming !== "boolean")) {
    return { ok: false, error: "La conversación no cumple los límites de análisis." };
  }
  return {
    ok: true,
    value: {
      businessName: contact.company.trim(),
      businessKnowledge: businessKnowledge.trim(),
      channel: "whatsapp",
      stage: contact.stage,
      messages: messages.map(m => ({ role: m.incoming ? "customer" : "business", text: m.text.trim() })),
    },
  };
}
