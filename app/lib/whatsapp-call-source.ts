/*
  Llamadas de WhatsApp recibidas por Telnyx.

  El número dedicado a llamadas de WhatsApp se configura en
  TELNYX_WHATSAPP_CALL_NUMBER (solo en QA hasta su aprobación).
  Telnyx entrega estas llamadas por la misma conexión de voz que
  las llamadas normales, por eso las distinguimos por el número de
  destino o por marcas de WhatsApp en el webhook.
*/

export const WHATSAPP_CALL_SOURCE = "Telnyx WhatsApp Call";
export const PSTN_CALL_SOURCE = "Telnyx AxiomAI Receptionist";

function lastTenDigits(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function mentionsWhatsapp(value: unknown): boolean {
  return typeof value === "string" && /whatsapp/i.test(value);
}

export function isWhatsappCall(
  metadata: Record<string, unknown> | null | undefined,
  whatsappNumber: string | undefined = process.env.TELNYX_WHATSAPP_CALL_NUMBER
): boolean {
  if (!metadata || typeof metadata !== "object") return false;

  const marked =
    mentionsWhatsapp(metadata.from) ||
    mentionsWhatsapp(metadata.to) ||
    mentionsWhatsapp(metadata.channel) ||
    mentionsWhatsapp(metadata.call_type) ||
    mentionsWhatsapp(metadata.network);
  if (marked) return true;

  const target = lastTenDigits(whatsappNumber);
  if (!target) return false;

  return [metadata.to, metadata.telnyx_agent_target].some(
    (value) => lastTenDigits(value) === target
  );
}

export function callSourceFor(
  metadata: Record<string, unknown> | null | undefined,
  whatsappNumber?: string
): string {
  return isWhatsappCall(metadata, whatsappNumber)
    ? WHATSAPP_CALL_SOURCE
    : PSTN_CALL_SOURCE;
}
