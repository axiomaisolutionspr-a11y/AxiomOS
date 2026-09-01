type SmsAlertData = {
  callerName?: string | null;
  callerCompany?: string | null;
  callerPhone?: string | null;
  callReason?: string | null;
};

export async function sendSmsAlert(data: SmsAlertData) {
  const smsEnabled =
    String(process.env.SMS_ENABLED || "").toLowerCase() === "true";

  // Mientras SMS_ENABLED=false, jamás se enviará un SMS.
  if (!smsEnabled) {
    console.log("📵 SMS desactivado. Alerta preparada pero no enviada.");

    return {
      sent: false,
      reason: "SMS_DISABLED",
    };
  }

  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_SMS_FROM;
  const to = process.env.SMS_ALERT_TO;

  if (!telnyxApiKey) {
    throw new Error("Falta TELNYX_API_KEY.");
  }

  if (!from) {
    throw new Error("Falta TELNYX_SMS_FROM.");
  }

  if (!to) {
    throw new Error("Falta SMS_ALERT_TO.");
  }

  const callerName =
    data.callerName?.trim() || "Nombre no disponible";

  const callerCompany =
    data.callerCompany?.trim() || "Empresa no disponible";

  const callerPhone =
    data.callerPhone?.trim() || "Teléfono no disponible";

  const callReason =
    data.callReason?.trim() || "Motivo no disponible";

  const text =
    `AxiomAI Solutions: Nueva llamada recibida en AxiomOS.\n` +
    `Prospecto: ${callerName}\n` +
    `Empresa: ${callerCompany}\n` +
    `Teléfono: ${callerPhone}\n` +
    `Motivo: ${callReason}\n` +
    `Revisa el CRM para seguimiento.`;

  const response = await fetch(
    "https://api.telnyx.com/v2/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${telnyxApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        text,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("❌ Error enviando SMS por Telnyx:", result);

    throw new Error(
      `Telnyx SMS error: ${response.status}`
    );
  }

  console.log("✅ SMS enviado correctamente.");

  return {
    sent: true,
    result,
  };
}