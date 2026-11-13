/** @param {NodeJS.ProcessEnv} env */
export function whatsappManualOptOutMode(env = process.env) {
  if (env.VERCEL_ENV === "preview" && env.AXIOMOS_MANUAL_WHATSAPP_OPTOUT_QA === "true") return "qa";
  if (env.VERCEL_ENV === "production" && env.AXIOMOS_WHATSAPP_MANUAL_OPTOUT_ENABLED === "true") return "production";
  return null;
}

/** @param {NodeJS.ProcessEnv} env */
export function whatsappManualOptOutSharesCampaignDatabase(env = process.env) {
  // Use the same effective commercial writer URL as the owner-authenticated action.
  // The switch never changes campaign DATABASE_URL or existing webhook credentials.
  const live = env.VERCEL_ENV === "production" && env.AXIOMOS_COMMERCIAL_LIVE_DATABASE_ENABLED === "true";
  const writerUrl = live ? env.AXIOMOS_COMMERCIAL_LIVE_WRITER_URL : env.AXIOMOS_COMMERCIAL_WRITER_URL;
  if (!env.DATABASE_URL || !writerUrl) return false;
  try {
    const campaign = new URL(env.DATABASE_URL);
    const writer = new URL(writerUrl);
    const endpoint = (/** @type {URL} */ url) => url.hostname.replace(/-pooler(?=\.)/, "");
    return ["postgres:", "postgresql:"].includes(campaign.protocol)
      && ["postgres:", "postgresql:"].includes(writer.protocol)
      && endpoint(campaign) === endpoint(writer)
      && (campaign.port || "5432") === (writer.port || "5432")
      && campaign.pathname === writer.pathname;
  } catch {
    return false;
  }
}
