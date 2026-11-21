import { createHmac, timingSafeEqual } from "node:crypto";

// Instagram API with Instagram Login signs webhooks (X-Hub-Signature-256) with
// the *Instagram* app secret, which differs from the Facebook app secret
// (META_APP_SECRET). Accept a payload signed by any configured secret.
// Returns only the NAME of the secret that matched, never its value.
export function verifyInstagramSignature(rawBody, signature, candidates) {
  const secrets = (candidates ?? []).filter(
    (c) => typeof c?.value === "string" && c.value.length >= 8
  );
  if (!secrets.length) return { valid: false, reason: "missing_secret", matched: null };
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature ?? "")) {
    return { valid: false, reason: "missing_or_malformed_signature", matched: null };
  }
  const provided = Buffer.from(signature.slice(7), "hex");
  const raw = Buffer.from(rawBody ?? "", "utf8");
  for (const { name, value } of secrets) {
    const digest = createHmac("sha256", value).update(raw).digest();
    if (provided.length === digest.length && timingSafeEqual(provided, digest)) {
      return { valid: true, reason: "verified", matched: name };
    }
  }
  return { valid: false, reason: "signature_mismatch", matched: null };
}

export function instagramSignatureSecrets(env = process.env) {
  return [
    { name: "INSTAGRAM_APP_SECRET", value: env.INSTAGRAM_APP_SECRET },
    { name: "META_APP_SECRET", value: env.META_APP_SECRET },
  ];
}

// Meta entrega mensajes de Instagram como entry[].messaging[] y, en algunos
// casos (p. ej. el botón "Probar"), como entry[].changes[] con field "messages".
export function instagramMessagingEvents(entry) {
  const events = Array.isArray(entry?.messaging) ? [...entry.messaging] : [];
  for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
    if (change?.field === "messages" && change.value && typeof change.value === "object") {
      events.push(change.value);
    }
  }
  return events;
}

// Mensaje enviado por la propia cuenta de negocio (eco), no por un cliente.
export function isOwnInstagramMessage(event, entry) {
  if (event?.message?.is_echo) return true;
  const sender = event?.sender?.id;
  return Boolean(sender) && String(sender) === String(entry?.id ?? "");
}

// Resumen sin IDs, textos ni datos personales, apto para logs.
export function summarizeInstagramPayload(body) {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  return {
    object: typeof body?.object === "string" ? body.object : null,
    entries: entries.length,
    messaging: entries.reduce((n, e) => n + (Array.isArray(e?.messaging) ? e.messaging.length : 0), 0),
    changes: entries.flatMap((e) => (Array.isArray(e?.changes) ? e.changes.map((c) => c?.field ?? null) : [])),
    kinds: entries.flatMap((e) =>
      instagramMessagingEvents(e).map((ev) =>
        ev?.message?.is_echo ? "echo" : ev?.message?.text ? "text" : ev?.message ? "message_other" :
        ev?.read ? "read" : ev?.reaction ? "reaction" : ev?.postback ? "postback" : "other"
      )
    ),
  };
}
