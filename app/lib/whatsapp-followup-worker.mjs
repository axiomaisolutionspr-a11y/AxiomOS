import { timingSafeEqual } from "node:crypto";

const expectedPhone = "1313032805233574";
const expectedTemplate = "1623748565895066";

/**
 * @param {string | null} received
 * @param {string | undefined} secret
 */
export function isFollowupCronAuthorized(received, secret) {
  if (!secret || secret.length < 16 || !received) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(received);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** @param {NodeJS.ProcessEnv} env */
export function whatsappFollowupWorkerSettings(env) {
  const key = env.DUALHOOK_API_KEY;
  const host = env.AXIOMOS_COMMERCIAL_DATABASE_HOST;
  const databaseUrl = env.AXIOMOS_WHATSAPP_FOLLOWUP_WORKER_DATABASE_URL;
  if (env.VERCEL_ENV !== "production" || env.AXIOMOS_WHATSAPP_FOLLOWUP_DISPATCH_ENABLED !== "true" ||
      env.WHATSAPP_PHONE_NUMBER_ID !== expectedPhone || env.AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID !== expectedTemplate ||
      !key || !host || !databaseUrl) return null;

  try {
    const url = new URL(databaseUrl);
    const direct = (name) => name.replace(/-pooler(?=\.)/, "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/neondb" ||
        !url.hostname.endsWith(".neon.tech") || direct(url.hostname) !== direct(host) ||
        url.username !== "axiomos_whatsapp_followup_worker" || !url.password) return null;
    return { key, phoneId: expectedPhone, databaseUrl: url.href };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   verifyProvider: () => Promise<{phone: string, template: string}>,
 *   claim: () => Promise<{claim_id: string, recipient: string} | undefined>,
 *   send: (recipient: string) => Promise<{outcome: "accepted" | "held" | "rejected" | "unknown", providerId: string | null}>,
 *   finish: (id: string, result: {outcome: string, providerId: string | null}) => Promise<boolean>
 * }} deps
 */
export async function runWhatsAppFollowup(deps) {
  const provider = await deps.verifyProvider();
  if (provider.phone !== "verified" || provider.template !== "verified") return "provider_unavailable";

  const job = await deps.claim();
  if (!job) return "no_eligible_followup";
  const result = await deps.send(job.recipient).catch(() => ({ outcome: "unknown", providerId: null }));
  const saved = await deps.finish(job.claim_id, result);
  return saved ? result.outcome : "audit_unavailable";
}
