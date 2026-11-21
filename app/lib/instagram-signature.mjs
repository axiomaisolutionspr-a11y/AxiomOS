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
