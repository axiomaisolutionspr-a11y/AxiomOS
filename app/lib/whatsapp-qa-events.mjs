// Parse only explicitly allowlisted test messages from a verified Meta payload.
// Call this after validating the X-Hub-Signature-256 signature.
export function qaTextMessages(payload, { wabaId, phoneNumberId, recipient }) {
  if (!/^\d{1,64}$/.test(wabaId || "") || !/^\d{1,64}$/.test(phoneNumberId || "") ||
      !/^\d{8,20}$/.test(recipient || "")) return [];
  if (payload?.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];
  const result = [];
  for (const entry of payload.entry) {
    if (String(entry?.id) !== wabaId || !Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      if (change?.field !== "messages" || String(change?.value?.metadata?.phone_number_id) !== phoneNumberId ||
          !Array.isArray(change?.value?.messages)) continue;
      for (const message of change.value.messages) {
        if (message?.type !== "text" || message.from !== recipient ||
            typeof message.id !== "string" || !/^wamid\.[A-Za-z0-9_=-]{1,240}$/.test(message.id) ||
            typeof message.text?.body !== "string") continue;
        const text = message.text.body.trim();
        if (!text || text.length > 4000) continue;
        const timestamp = typeof message.timestamp === "string" && /^\d{10}$/.test(message.timestamp)
          ? Number(message.timestamp)
          : undefined;
        result.push(timestamp === undefined ? { id: message.id, text } : { id: message.id, text, timestamp });
      }
    }
  }
  return result;
}
