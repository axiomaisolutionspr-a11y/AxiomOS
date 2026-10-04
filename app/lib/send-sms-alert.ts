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
  Limpia acentos y caracteres especiales para ayudar
  a mantener el SMS compacto y evitar segmentos Unicode
  innecesarios.
*/
function smsClean(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
  Limita textos largos para que la alerta SMS
  siga siendo rápida de leer.
*/
function shorten(
  value: string,
  maxLength: number
) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value
    .slice(0, maxLength - 3)
    .trim()}...`;
}

export async function sendSmsAlert(
  data: SmsAlertData
) {
  const smsEnabled =
    String(process.env.SMS_ENABLED || "")
      .toLowerCase() === "true";

  /*
    Si SMS_ENABLED no está activo,
    no enviamos el mensaje.
  */
  if (!smsEnabled) {
    console.log(
      "SMS desactivado. Alerta preparada pero no enviada."
    );

    return {
      sent: false,
      reason: "SMS_DISABLED",
    };
  }

  /*
    Variables de entorno.
  */
  const telnyxApiKey =
    process.env.TELNYX_API_KEY;

  const smsFrom =
    process.env.TELNYX_SMS_FROM;

  const smsTo =
    process.env.SMS_ALERT_TO;

  /*
    Validamos configuración antes de llamar a Telnyx.
  */
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

  /*
    Datos que aparecerán en la alerta.
  */
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
    FORMATO FINAL DEL SMS

    El SMS funciona como alerta rápida.
    El detalle completo continúa disponible
    en el email y en el CRM de AxiomOS.
  */
  const text = [
    "AxiomAI: Nueva llamada",
    "",
    callerName,
    `Tel: ${callerPhone}`,
    "",
    `Motivo: ${callReason}`,
    "",
    "Revisar AxiomOS.",
  ].join("\n");

  /*
    Envío mediante Telnyx Messaging API.
  */
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

  /*
    Si Telnyx rechaza el mensaje,
    registramos el error para verlo en Vercel Logs.
  */
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