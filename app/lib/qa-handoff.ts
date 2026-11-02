export function qaHandoffEnabled() {
  const env = process.env;
  if (env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== "feature/axira-whatsapp-service-menu" || env.DUALHOOK_API_KEY) return false;
  try {
    return ["ep-flat-art-av3pifin", "ep-flat-art-av3pifin-pooler"].some(endpoint =>
      new URL(env.DATABASE_URL || "").hostname === endpoint + ".c-11.us-east-1.aws.neon.tech");
  } catch { return false; }
}
export const qaHandoffPhone = "12025550118";
