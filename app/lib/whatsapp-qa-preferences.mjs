import { createHmac } from "node:crypto";

/** @param {any} payload @param {{wabaId?: string, phoneId?: string, secret: string}} scope */
export function qaMarketingPreferences(payload, { wabaId, phoneId, secret }) {
  if (!wabaId || !phoneId || !secret || payload?.object !== "whatsapp_business_account" ||
      !Array.isArray(payload.entry)) return [];
  const preferences = [];
  for (const entry of payload.entry) {
    if (String(entry?.id) !== wabaId || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const value = change?.value;
      if (change?.field !== "user_preferences" || String(value?.metadata?.phone_number_id) !== phoneId ||
          !Array.isArray(value.user_preferences)) continue;
      for (const event of value.user_preferences) {
        if (event?.category !== "marketing_messages" || !["stop", "resume"].includes(event.value) ||
            !/^\d{10}$/.test(String(event.timestamp))) continue;
        const identifiers = [
          ["bsuid", event.user_id, /^[A-Z]{2}\.[A-Za-z0-9._-]{1,100}$/],
          ["wa_id", event.wa_id, /^[1-9]\d{7,14}$/],
        ];
        for (const [kind, id, pattern] of identifiers) {
          if (typeof id !== "string" || !pattern.test(id)) continue;
          const key = createHmac("sha256", secret).update(JSON.stringify([wabaId, phoneId, kind, id])).digest("hex");
          preferences.push({ key, state: event.value, timestamp: Number(event.timestamp) });
        }
      }
    }
  }
  return preferences;
}
