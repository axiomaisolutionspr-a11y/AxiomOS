/**
 * AxiomOS outbound policy v1. NO provider adapter is connected.
 * This function ONLY evaluates an isolated QA dispatch candidate.
 * Every caller must obtain authoritative consent/suppression/frequency
 * evidence server-side; NEVER trust these fields from a browser.
 */
export const GATE_VERSION = "2026-11-09-v1";
const CHANNELS = new Set(["sms", "whatsapp"]);
const PURPOSES = new Set(["followup", "appointment_reminder"]);
const E164 = /^\+[1-9]\d{7,14}$/;
const validDate = x => {
  if (x === null || x === undefined || x === "") return null;
  const d = x instanceof Date ? x : new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
};
const deny = reason => Object.freeze({allowed:false,reason});
function prHour(now) {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Puerto_Rico", hour:"2-digit", hourCycle:"h23"
  }).format(now));
}
export function evaluateDispatch(i) {
  if (!i || typeof i !== "object") return deny("invalid_input");
  const now = validDate(i.now);
  if (!now) return deny("invalid_clock");
  if (i.environment !== "qa") return deny("qa_only");
  if (i.enabled !== true) return deny("feature_disabled");
  if (i.ownerAuthorized !== true || i.ownerSessionValid !== true) return deny("owner_authorization_required");
  if (i.tenantId !== "axiomai") return deny("tenant_mismatch");
  if (typeof i.queueId !== "string" || !/^\d{1,18}$/.test(i.queueId)) return deny("invalid_queue");
  if (!CHANNELS.has(i.channel) || !PURPOSES.has(i.purpose)) return deny("unsupported_channel_or_purpose");
  if (i.status !== "approved_for_test") return deny("not_approved_for_test");
  if (i.isSynthetic !== true || i.recipientAllowlisted !== true) return deny("not_synthetic_allowlisted");
  if (typeof i.recipient !== "string" || !E164.test(i.recipient)) return deny("invalid_recipient");
  if (typeof i.body !== "string" || i.body.trim().length < 5 || i.body.length > 500) return deny("invalid_message");
  if (i.containsSensitiveData !== false) return deny("sensitive_data");
  const scheduled = validDate(i.scheduledFor);
  if (!scheduled || scheduled > now) return deny("not_due");
  if (!i.consent || i.consent.state !== "opt_in" || i.consent.channel !== i.channel ||
      i.consent.purpose !== i.purpose || i.consent.prospectId !== i.prospectId) return deny("no_current_opt_in");
  const consentAt = validDate(i.consent.recordedAt);
  if (!consentAt || consentAt > now || now-consentAt > 90*24*3600*1000 ||
      typeof i.consent.evidence !== "string" || i.consent.evidence.trim().length < 3) return deny("invalid_consent_evidence");
  if (i.optOutAfterConsent !== false || i.globalSuppressed !== false) return deny("suppressed");
  if (i.lastContactAt === undefined || i.lastContactAt === "" ||
      (i.lastContactAt !== null && (!validDate(i.lastContactAt) ||
      now-validDate(i.lastContactAt) < 24*3600*1000))) return deny("rate_limit_24h");
  if (!Number.isInteger(i.messagesInLast7Days) || i.messagesInLast7Days < 0 ||
      i.messagesInLast7Days >= 2) return deny("rate_limit_7d");
  const hour=prHour(now);
  if (hour < 9 || hour >= 18) return deny("quiet_hours");
  if (i.channel === "whatsapp") {
    const inbound=validDate(i.lastInboundWhatsAppAt);
    const inWindow=inbound && now>=inbound && now-inbound<24*3600*1000;
    if (!inWindow && (i.templateApproved !== true ||
        typeof i.templateName !== "string" || !/^[a-z0-9_]{3,100}$/.test(i.templateName)))
      return deny("whatsapp_template_required");
  }
  if (i.idempotencyKey !== `axiomai:${i.channel}:${i.queueId}`)
    return deny("idempotency_key_mismatch");
  return Object.freeze({allowed:true,reason:"eligible_for_qa_claim",
    idempotencyKey:i.idempotencyKey,gateVersion:GATE_VERSION});
}
