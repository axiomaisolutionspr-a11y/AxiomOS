const runtime = "https://api.dualhook.com/v25.0/";
const assetId = /^[1-9][0-9]{4,24}$/;

type Check = "unconfigured" | "verified" | "unavailable";

export async function checkWhatsAppFollowupProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{ phone: Check; template: Check }> {
  const key = env.DUALHOOK_API_KEY;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const templateId = env.AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID;
  if (env.VERCEL_ENV !== "production" || !key || !phoneId || !assetId.test(phoneId)) {
    return { phone: "unconfigured", template: "unconfigured" };
  }

  async function readAsset(id: string, fields: string) {
    try {
      const url = new URL(id, runtime);
      url.searchParams.set("fields", fields);
      const response = await fetcher(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const asset: { id?: string; status?: string; category?: string } | null = await response.json();
      return asset?.id === id ? asset : null;
    } catch {
      return null;
    }
  }

  const [phone, template] = await Promise.all([
    readAsset(phoneId, "id"),
    templateId && assetId.test(templateId) ? readAsset(templateId, "id,status,category") : null,
  ]);
  const templateConfigured = Boolean(templateId && assetId.test(templateId));
  const templateApproved = template?.status === "APPROVED" &&
    ["MARKETING", "UTILITY"].includes(template.category ?? "");
  return {
    phone: phone ? "verified" : "unavailable",
    template: !templateConfigured ? "unconfigured" : templateApproved ? "verified" : "unavailable",
  };
}
