import { createHmac, timingSafeEqual } from "node:crypto";

export function matchesWebhookSecret(expected, actual) {
  if (!expected || !actual) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validWebhookSignature(body, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature ?? "")) return false;
  return matchesWebhookSecret(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`, signature);
}

export function marketingPreferenceEvents(payload, { wabaId, phoneId, contactKeySecret }) {
  if (!wabaId || !phoneId || !contactKeySecret || payload?.object !== "whatsapp_business_account" ||
      !Array.isArray(payload.entry)) return [];

  const events = [];
  for (const entry of payload.entry) {
    if (entry?.id !== wabaId || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const data = change?.value;
      if (change?.field !== "user_preferences" || data?.messaging_product !== "whatsapp" ||
          data.metadata?.phone_number_id !== phoneId || !Array.isArray(data.user_preferences)) continue;
      for (const preference of data.user_preferences) {
        if (preference?.category !== "marketing_messages" || !["stop", "resume"].includes(preference.value) ||
            !/^\d{10}$/.test(String(preference.timestamp))) continue;
        const identifiers = [
          ["bsuid", preference.user_id, /^[A-Z]{2}\.[A-Za-z0-9._-]{1,100}$/],
          ["wa_id", preference.wa_id, /^[1-9]\d{7,14}$/],
        ];
        for (const [kind, id, pattern] of identifiers) {
          if (typeof id !== "string" || !pattern.test(id)) continue;
          const key = createHmac("sha256", contactKeySecret)
            .update(JSON.stringify([wabaId, phoneId, kind, id])).digest("hex");
          events.push({ key, preference: preference.value, timestamp: Number(preference.timestamp) });
        }
      }
    }
  }
  return events;
}
