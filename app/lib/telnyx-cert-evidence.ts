export type TelnyxCertStatus = "delivered" | "failed" | "unconfirmed" | "mismatch";
export type TelnyxCertEvidence = { status: TelnyxCertStatus; providerStatus: string; explanation: string; recordedAt: string | null };

type TelnyxMessage = {
  id?: unknown;
  type?: unknown;
  direction?: unknown;
  text?: unknown;
  received_at?: unknown;
  sent_at?: unknown;
  to?: unknown;
};

/**
 * Evidence only. A reserved test attempt or Telnyx API acceptance never proves handset delivery.
 * Compare the recipient, exact certified text and 9-Nov-2026 time window before attributing
 * a queried Telnyx message to the historical AxiomOS one-shot certification.
 */
export function evaluateTelnyxSmsCertificate(payload: unknown, requestedId: string): TelnyxCertEvidence {
  const mismatch: TelnyxCertEvidence = {
    status: "mismatch", providerStatus: "unknown",
    explanation: "No corresponde inequívocamente al SMS de certificación del 9 de noviembre.",
    recordedAt: null
  };
  if (!payload || typeof payload !== "object") return mismatch;
  const data = payload as TelnyxMessage;
  if (data.id !== requestedId || data.direction !== "outbound" || String(data.type).toUpperCase() !== "SMS"
    || typeof data.text !== "string"
    || !data.text.includes("PRUEBA AUTORIZADA de SMS Autopilot (09-nov-2026)")) return mismatch;
  const recipients = Array.isArray(data.to) ? data.to as Array<{phone_number?: unknown; status?: unknown}> : [];
  const recipient = recipients.find((entry) =>
    typeof entry?.phone_number === "string" && entry.phone_number.replace(/\D/g, "") === "17872320132");
  if (!recipient) return mismatch;
  const timeValue = typeof data.received_at === "string" ? data.received_at
    : typeof data.sent_at === "string" ? data.sent_at : "";
  const millis = Date.parse(timeValue);
  if (!Number.isFinite(millis) || millis < Date.parse("2026-11-09T14:44:00Z")
    || millis > Date.parse("2026-11-09T16:44:30Z")) return mismatch;
  const providerStatus = typeof recipient.status === "string" ? recipient.status : "unknown";
  const base = { providerStatus, recordedAt: new Date(millis).toISOString() };
  if (providerStatus === "delivered")
    return { ...base, status: "delivered", explanation: "El proveedor confirma entrega al operador destinatario." };
  if (["delivery_failed", "sending_failed"].includes(providerStatus))
    return { ...base, status: "failed", explanation: "Telnyx confirma un fallo de entrega o de envío." };
  return { ...base, status: "unconfirmed",
    explanation: "El proveedor no ha confirmado entrega final. No se debe enviar otro SMS." };
}
