export function whatsappPilotSettings(env: NodeJS.ProcessEnv = process.env) {
  const recipient = env.AXIOMOS_WHATSAPP_PILOT_TO;
  const key = env.DUALHOOK_API_KEY;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (env.VERCEL_ENV !== "production" || env.AXIOMOS_WHATSAPP_PILOT_ENABLED !== "true" ||
      env.AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED !== "true" ||
      env.AXIOMOS_WHATSAPP_FOLLOWUP_TEMPLATE_ID !== "1623748565895066" ||
      phoneId !== "1419337331256187" || !key || !recipient || !/^1(?:787|939)[0-9]{7}$/.test(recipient)) {
    return null;
  }
  return { key, phoneId, recipient };
}

type PilotOutcome = {
  outcome: "accepted" | "held" | "rejected" | "unknown";
  providerId: string | null;
};

export async function sendWhatsAppPilot(
  settings: NonNullable<ReturnType<typeof whatsappPilotSettings>>,
  fetcher: typeof fetch = fetch,
): Promise<PilotOutcome> {
  try {
    const response = await fetcher(`https://api.dualhook.com/v25.0/${settings.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: settings.recipient,
        type: "template",
        template: { name: "seguimiento_consulta_axiomai_es", language: { code: "es" } },
      }),
      signal: AbortSignal.timeout(12000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      return { outcome: response.status >= 400 && response.status < 500 ? "rejected" : "unknown", providerId: null };
    }
    const data: { messages?: Array<{ id?: unknown; message_status?: string }> } = await response.json();
    const message = data.messages?.[0];
    if (typeof message?.id !== "string" || !/^wamid\.[A-Za-z0-9_+=/-]{1,249}$/.test(message.id)) {
      return { outcome: "unknown", providerId: null };
    }
    return {
      outcome: message.message_status === "held_for_quality_assessment" ? "held" : "accepted",
      providerId: message.id,
    };
  } catch {
    return { outcome: "unknown", providerId: null };
  }
}
