/**
 * Verificación estructural de webhooks de WhatsApp recibidos vía Dualhook.
 *
 * Contexto (documentación de Dualhook, "Messaging Webhook"): con Embedded Signup,
 * Meta firma X-Hub-Signature-256 con el App Secret de Dualhook, que AxiomAI no
 * posee. Por eso NO se puede exigir la firma con nuestro META_APP_SECRET sin
 * rechazar mensajes legítimos. Dualhook recomienda en su lugar:
 *   1. object === "whatsapp_business_account"
 *   2. entry[].id === WABA esperado
 *   3. lista permitida de changes[].field
 *   4. value.metadata.phone_number_id === número esperado (si el campo lo trae)
 *
 * Este módulo solo evalúa; la ruta decide si registra (sombra) o descarta.
 */

export const ALLOWED_FIELDS = ["messages", "smb_message_echoes", "message_template_status_update", "account_update", "history", "smb_app_state_sync"];

/**
 * @param {unknown} body  JSON ya parseado
 * @param {{wabaId?: string, phoneNumberId?: string}} expected
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function assessWhatsAppPayload(body, expected = {}) {
  const reasons = [];
  if (!body || typeof body !== "object") return { valid: false, reasons: ["not_object"] };
  if (body.object !== "whatsapp_business_account") reasons.push("unexpected_object");

  const entries = Array.isArray(body.entry) ? body.entry : [];
  if (entries.length === 0) reasons.push("no_entries");

  for (const entry of entries) {
    if (expected.wabaId && String(entry?.id ?? "") !== String(expected.wabaId)) reasons.push("waba_mismatch");
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const field = change?.field;
      if (!ALLOWED_FIELDS.includes(field)) reasons.push("field_not_allowed");
      const phoneId = change?.value?.metadata?.phone_number_id;
      if (expected.phoneNumberId && phoneId !== undefined && String(phoneId) !== String(expected.phoneNumberId)) {
        reasons.push("phone_number_mismatch");
      }
      if (field === "messages" && expected.phoneNumberId && phoneId === undefined) reasons.push("phone_number_missing");
    }
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}
