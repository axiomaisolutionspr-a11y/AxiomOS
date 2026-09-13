type EmailAlertData = {
  callerName?: string | null;
  callerCompany?: string | null;
  callerPhone?: string | null;
  callReason?: string | null;
  callClassification?: string | null;
  callOutcome?: string | null;
  nextAction?: string | null;
  callSummary?: string | null;
};

function safe(
  value?: string | null,
  fallback = "No disponible"
) {
  const text = value?.trim();
  return text || fallback;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Traduce únicamente lo que mostramos en el correo.

  Los valores originales que llegan desde Telnyx
  y se guardan en AxiomOS / Neon NO se modifican.
*/
function translateEmailValue(value: string): string {
  const translations: Record<string, string> = {
    "New Prospect": "Nuevo prospecto",
    "Existing Customer": "Cliente existente",

    "Follow-up Required": "Requiere seguimiento",
    "Follow Up Required": "Requiere seguimiento",

    "Call Back": "Devolver llamada",
    "Human Follow-up": "Seguimiento humano",
    "Follow-up": "Seguimiento",

    "Schedule Appointment": "Programar cita",
    "Send Information": "Enviar información",

    "Transfer": "Transferir",
    "Transferred": "Transferencia realizada",

    "No Follow-up": "No requiere seguimiento",

    "Resolved": "Resuelto",
    "Information Provided": "Información proporcionada",

    "Appointment Requested": "Cita solicitada",
    "Support Required": "Requiere soporte",
    "Urgent": "Urgente",
    "Sales Opportunity": "Oportunidad de venta",

    "Interested": "Interesado",
    "Not Interested": "No interesado",
    "Needs Follow-up": "Necesita seguimiento",
  };

  return translations[value] ?? value;
}

export async function sendEmailAlert(
  data: EmailAlertData
) {
  const emailEnabled =
    String(process.env.EMAIL_ENABLED || "")
      .toLowerCase() === "true";

  /*
    Podemos mantener el sistema configurado sin enviar
    correos hasta activar EMAIL_ENABLED=true.
  */
  if (!emailEnabled) {
    console.log(
      "📧 Email desactivado. Alerta preparada pero no enviada."
    );

    return {
      sent: false,
      reason: "EMAIL_DISABLED",
    };
  }

  const resendApiKey =
    process.env.RESEND_API_KEY;

  const emailFrom =
    process.env.EMAIL_ALERT_FROM;

  const emailTo =
    process.env.EMAIL_ALERT_TO;

  if (!resendApiKey) {
    throw new Error(
      "Falta RESEND_API_KEY."
    );
  }

  if (!emailFrom) {
    throw new Error(
      "Falta EMAIL_ALERT_FROM."
    );
  }

  if (!emailTo) {
    throw new Error(
      "Falta EMAIL_ALERT_TO."
    );
  }

  /*
    =========================================================
    DATOS DE LA LLAMADA
    =========================================================
  */

  const callerName = safe(
    data.callerName,
    "Nombre no disponible"
  );

  const callerCompany = safe(
    data.callerCompany,
    "Empresa no disponible"
  );

  const callerPhone = safe(
    data.callerPhone,
    "Teléfono no disponible"
  );

  const callReason = safe(
    data.callReason,
    "Motivo no disponible"
  );

  const callClassification = safe(
    data.callClassification,
    "Sin clasificación"
  );

  const callOutcome = safe(
    data.callOutcome,
    "Resultado no disponible"
  );

  const nextAction = safe(
    data.nextAction,
    "Seguimiento pendiente"
  );

  const callSummary = safe(
    data.callSummary,
    "Resumen no disponible"
  );

  /*
    Valores solamente para presentación en español.
  */

  const displayClassification =
    translateEmailValue(
      callClassification
    );

  const displayOutcome =
    translateEmailValue(
      callOutcome
    );

  const displayNextAction =
    translateEmailValue(
      nextAction
    );

  /*
    =========================================================
    ASUNTO
    =========================================================
  */

  const subject =
    callerName !== "Nombre no disponible"
      ? `Nueva llamada AxiomOS — ${callerName}`
      : "Nueva llamada recibida en AxiomOS";

  /*
    =========================================================
    VERSIÓN TEXTO
    =========================================================
  */

  const text = `
AXIOMAI SOLUTIONS — NUEVA LLAMADA

Nombre: ${callerName}
Empresa: ${callerCompany}
Teléfono: ${callerPhone}

Clasificación: ${displayClassification}
Resultado: ${displayOutcome}

Motivo de la llamada:
${callReason}

Próxima acción:
${displayNextAction}

Resumen:
${callSummary}

----------------------------------------
AxiomOS
AxiomAI Solutions
https://axiomaisolutions.org
`.trim();

  /*
    =========================================================
    VERSIÓN HTML
    =========================================================
  */

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${escapeHtml(subject)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    role="presentation"
    style="
      width:100%;
      background:#f4f7fb;
      padding:30px 12px;
    "
  >
    <tr>
      <td align="center">

        <table
          width="620"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="
            width:100%;
            max-width:620px;
            background:#071427;
            border-radius:14px;
            overflow:hidden;
            box-shadow:
              0 10px 30px rgba(0,0,0,0.18);
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              style="
                padding:30px 32px 20px 32px;
              "
            >
              <div
                style="
                  color:#18c8ff;
                  font-size:13px;
                  font-weight:700;
                  letter-spacing:1.5px;
                  margin-bottom:12px;
                "
              >
                AXIOMAI SOLUTIONS
              </div>

              <div
                style="
                  color:#ffffff;
                  font-size:27px;
                  font-weight:700;
                  line-height:1.2;
                "
              >
                Nueva llamada recibida
              </div>

              <div
                style="
                  color:#aebdd0;
                  font-size:14px;
                  line-height:1.6;
                  margin-top:8px;
                "
              >
                AxiomOS registró una nueva llamada
                que puede requerir seguimiento.
              </div>
            </td>
          </tr>

          <!-- DATOS PRINCIPALES -->
          <tr>
            <td
              style="
                padding:0 32px 18px 32px;
              "
            >
              <div
                style="
                  border:1px solid #126786;
                  border-radius:12px;
                  padding:22px;
                  background:#0a1d32;
                  color:#ffffff;
                  font-size:14px;
                  line-height:1.9;
                "
              >

                <div>
                  <strong>Nombre:</strong>
                  ${escapeHtml(callerName)}
                </div>

                <div>
                  <strong>Empresa:</strong>
                  ${escapeHtml(callerCompany)}
                </div>

                <div>
                  <strong>Teléfono:</strong>
                  <a
                    href="tel:${escapeHtml(callerPhone)}"
                    style="
                      color:#20bfff;
                      text-decoration:none;
                    "
                  >
                    ${escapeHtml(callerPhone)}
                  </a>
                </div>

                <div>
                  <strong>Clasificación:</strong>
                  ${escapeHtml(
                    displayClassification
                  )}
                </div>

                <div>
                  <strong>Resultado:</strong>
                  ${escapeHtml(
                    displayOutcome
                  )}
                </div>

              </div>
            </td>
          </tr>

          <!-- DETALLES -->
          <tr>
            <td
              style="
                padding:0 32px 18px 32px;
              "
            >
              <div
                style="
                  border:1px solid #126786;
                  border-radius:12px;
                  padding:22px;
                  background:#0a1d32;
                  color:#ffffff;
                  font-size:14px;
                  line-height:1.65;
                "
              >

                <div
                  style="
                    color:#19c9ff;
                    font-weight:700;
                    margin-bottom:7px;
                  "
                >
                  Motivo de la llamada
                </div>

                <div
                  style="
                    margin-bottom:20px;
                    color:#e7eef7;
                  "
                >
                  ${escapeHtml(callReason)}
                </div>

                <div
                  style="
                    color:#19c9ff;
                    font-weight:700;
                    margin-bottom:7px;
                  "
                >
                  Próxima acción
                </div>

                <div
                  style="
                    margin-bottom:20px;
                    color:#ffffff;
                    font-weight:600;
                  "
                >
                  ${escapeHtml(
                    displayNextAction
                  )}
                </div>

                <div
                  style="
                    color:#19c9ff;
                    font-weight:700;
                    margin-bottom:7px;
                  "
                >
                  Resumen
                </div>

                <div
                  style="
                    color:#e7eef7;
                  "
                >
                  ${escapeHtml(callSummary)}
                </div>

              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td
              align="center"
              style="
                padding:8px 32px 28px 32px;
              "
            >
              <a
                href="https://axiomaisolutions.org/prospectos"
                style="
                  display:inline-block;
                  background:#16bdf3;
                  color:#041321;
                  font-weight:700;
                  text-decoration:none;
                  padding:13px 24px;
                  border-radius:8px;
                  font-size:14px;
                "
              >
                Ver prospectos en AxiomOS
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              align="center"
              style="
                padding:20px 24px 28px 24px;
                border-top:1px solid #17314c;
                color:#7990aa;
                font-size:12px;
                line-height:1.6;
              "
            >
              AxiomOS · AxiomAI Solutions
              <br />
              Automatización inteligente
              para empresas
              <br />
              axiomaisolutions.org
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  /*
    =========================================================
    ENVÍO CON RESEND
    =========================================================
  */

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${resendApiKey}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        subject,
        text,
        html,
      }),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "❌ Error enviando alerta por email:",
      result
    );

    throw new Error(
      `Resend email error: ${response.status}`
    );
  }

  console.log(
    "📧 Alerta por email enviada correctamente."
  );

  return {
    sent: true,
    result,
  };
}