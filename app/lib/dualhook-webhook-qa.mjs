export function dualhookValidationQaEnabled(env = process.env) {
  return env.VERCEL_ENV === "preview" && env.AXIOMOS_WA_VALIDATE_QA === "true";
}

// This checks routing metadata, not cryptographic authenticity. Dualhook's
// managed Meta app does not share its POST signing secret with customers.
export function classifyDualhookWebhook(body, expectedWaba, expectedPhoneId) {
  if (typeof expectedWaba !== "string" || !expectedWaba ||
      typeof expectedPhoneId !== "string" || !expectedPhoneId ||
      body?.object !== "whatsapp_business_account" ||
      !Array.isArray(body.entry) || body.entry.length === 0) return "reject";
  let messagesField = false;
  for (const entry of body.entry) {
    if (entry?.id !== expectedWaba || !Array.isArray(entry.changes)) return "reject";
    for (const change of entry.changes) {
      if (change?.field !== "messages") continue;
      messagesField = true;
      if (change.value?.metadata?.phone_number_id !== expectedPhoneId) return "reject";
    }
  }
  return messagesField ? "process" : "ignore";
}
