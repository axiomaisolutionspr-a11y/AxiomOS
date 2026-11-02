/**
 * Axira: clasificador puro de selección de servicios para WhatsApp.
 *
 * Módulo independiente. No altera rutas, bases de datos, webhooks ni mensajes.
 * El webhook puede utilizarlo después de las pruebas y revisión correspondientes.
 */
export type AxiraServiceKey =
  | "whatsapp"
  | "receptionist"
  | "crm"
  | "administration"
  | "robotics"
  | "all";

export type AxiraServiceSelection = {
  key: AxiraServiceKey;
  label: string;
  reply: string;
};

const SERVICES: Record<string, AxiraServiceSelection> = {
  "1": {
    key: "whatsapp",
    label: "WhatsApp y atención al cliente",
    reply: "¡Excelente! Podemos ayudarte a atender consultas de clientes por WhatsApp. ¿A qué se dedica tu negocio y cuántas consultas recibes aproximadamente al día?",
  },
  "2": {
    key: "receptionist",
    label: "Llamadas y recepcionista virtual",
    reply: "¡Con mucho gusto! Nuestra recepcionista virtual puede ayudar con las llamadas. ¿Qué tipo de negocio tienes y qué ocurre actualmente cuando no puedes contestar?",
  },
  "3": {
    key: "crm",
    label: "CRM, ventas y seguimiento",
    reply: "¡Perfecto! Podemos ayudarte a organizar prospectos y dar seguimiento. ¿Cómo registran actualmente los clientes y las oportunidades de venta?",
  },
  "4": {
    key: "administration",
    label: "Administración, inventario y facturación",
    reply: "¡Claro! Evaluamos soluciones empresariales para cotizaciones, inventario, ventas y facturación. ¿Qué proceso te interesa mejorar primero y qué sistema utilizas hoy?",
  },
  "5": {
    key: "robotics",
    label: "Robótica y automatización",
    reply: "¡Excelente! Trabajamos soluciones de robótica y automatización según las necesidades de cada empresa. ¿Te interesa limpieza, seguridad, asistencia u otra aplicación?",
  },
  "6": {
    key: "all",
    label: "Todas las soluciones",
    reply: "¡Con gusto te orientamos! ¿A qué se dedica tu negocio y cuál es el problema que más tiempo o dinero te cuesta actualmente?",
  },
};

function normalizeSelection(message: string): string {
  return message
    .normalize("NFKC")
    .replace(/\uFE0F/g, "")
    .replace(/\u20E3/g, "")
    .trim();
}

/**
 * Solo intercepta selecciones inequívocas: 1–6 o su representación emoji.
 * No clasifica textos libres para no interferir con Brain ni sus comandos.
 */
export function classifyAxiraServiceSelection(
  message: string
): AxiraServiceSelection | null {
  const key = normalizeSelection(message);
  if (!/^[1-6]$/.test(key)) return null;
  return SERVICES[key] ?? null;
}
