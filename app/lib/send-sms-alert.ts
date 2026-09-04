type SmsAlertData = {
  callerName?: string | null;
  callerCompany?: string | null;
  callerPhone?: string | null;
  callReason?: string | null;
};

function safe(
  value?: string | null,
  fallback = "No disponible"
) {
  const text = value?.trim();
  return text || fallback;
}

/*
  Dejamos el SMS sin acentos para reducir la posibilidad
  de que Telnyx lo convierta a Unicode y lo divida
  innecesariamente en varios segmentos.
*/
function smsClean(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(
  value: string,
  maxLength: number
) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

export async function sendSmsAlert(
  data: SmsAlertData
) {
  const smsEnabled =
    String(process.env.SMS_ENABLED || "")
      .toLowerCase() === "true";

  if (!smsEnabled) {
    console.log(
      "SMS desactivado. Alerta preparada pero no enviada."
    );

    return {
      sent: false,
      reason: "SMS_DISABLED",
    };
  }

  const telnyxApiKey =
    process.env.TELNYX_API_KEY;

  const smsFrom =
    process.env.TELNYX_SMS_FROM;

  const smsTo =
    process.env.SMS_ALERT_TO;

  if (!telnyxApiKey) {
    throw new Error(
      "Falta TELNYX_API_KEY."
    );
  }

  if (!smsFrom) {
    throw new Error(
      "Falta TELNYX_SMS_FROM."
    );
  }

  if (!smsTo) {
    throw new Error(
      "Falta SMS_ALERT_TO."
    );
  }

  const callerName = shorten(
    smsClean(
      safe(
        data.callerName,
        "Nombre no disponible"
      )
    ),
    30
  );

  const callerPhone = shorten(
    smsClean(
      safe(
        data.callerPhone,
        "Telefono no disponible"
      )
    ),
    20
  );

  const callReason = shorten(
    smsClean(
      safe(
        data.callReason,
        "Requiere seguimiento"
      )
    ),
    55
  );

  /*
    SMS corto y pensado como alerta.

    El detalle completo permanece en:
    - Email
    - CRM de AxiomOS
  */
  const text = [
    "AxiomAI: Nueva llamada",
    `${callerName} | ${callerPhone}`,
    `Motivo: ${callReason}`,
    "Accion: revisar AxiomOS.",
  ].join("\n");

  const response = await fetch(
    "https://api.telnyx.com/v2/messages",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${telnyxApiKey}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        from: smsFrom,
        to: smsTo,
        text,
      }),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Error enviando SMS con Telnyx:",
      result
    );

    throw new Error(
      `Telnyx SMS error: ${response.status}`
    );
  }

  console.log(
    "SMS de AxiomOS enviado correctamente."
  );

  return {
    sent: true,
    result,
  };
}