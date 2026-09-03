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

function safe(value?: string | null, fallback = "No disponible") {
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

export async function sendEmailAlert(data: EmailAlertData) {
  const emailEnabled =
    String(process.env.EMAIL_ENABLED || "").toLowerCase() === "true";

  if (!emailEnabled) {
    console.log(
      "📧 Email desactivado. Alerta preparada pero no enviada."
    );

    return {
      sent: false,
      reason: "EMAIL_DISABLED",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_ALERT_FROM;
  const emailTo = process.env.EMAIL_ALERT_TO;

  if (!resendApiKey) {
    throw new Error("Falta RESEND_API_KEY.");
  }

  if (!emailFrom) {
    throw new Error("Falta EMAIL_ALERT_FROM.");
  }

  if (!emailTo) {
    throw new Error("Falta EMAIL_ALERT_TO.");
  }

  const callerName = safe(data.callerName, "Nombre no disponible");
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

  const subject =
    callerName !== "Nombre no disponible"
      ? `Nueva llamada AxiomOS — ${callerName}`
      : "Nueva llamada recibida en AxiomOS";

  const text = `
AXIOMAI SOLUTIONS — NUEVA LLAMADA

Nombre: ${callerName}
Empresa: ${callerCompany}
Teléfono: ${callerPhone}

Clasificación: ${callClassification}
Resultado: ${callOutcome}

Motivo:
${callReason}

Próxima acción:
${nextAction}

Resumen:
${callSummary}

Revisa el CRM de AxiomOS para continuar el seguimiento.
`.trim();

  const html = `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      max-width: 680px;
      margin: 0 auto;
      background: #07111f;
      color: #ffffff;
      padding: 28px;
      border-radius: 14px;
    ">
      <div style="
        color: #30d9ff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1.5px;
      ">
        AXIOMAI SOLUTIONS
      </div>

      <h1 style="
        margin: 8px 0 6px;
        font-size: 26px;
      ">
        Nueva llamada recibida
      </h1>

      <p style="
        margin-top: 0;
        color: #a9bed1;
      ">
        AxiomOS registró una nueva llamada que puede requerir seguimiento.
      </p>

      <div style="
        margin-top: 24px;
        border: 1px solid #1e7591;
        border-radius: 12px;
        padding: 20px;
        background: #0b1b2d;
      ">
        <p><strong>Nombre:</strong> ${escapeHtml(callerName)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(callerCompany)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(callerPhone)}</p>
        <p><strong>Clasificación:</strong> ${escapeHtml(
          callClassification
        )}</p>
        <p><strong>Resultado:</strong> ${escapeHtml(callOutcome)}</p>
      </div>

      <div style="
        margin-top: 18px;
        border: 1px solid #1e7591;
        border-radius: 12px;
        padding: 20px;
        background: #0b1b2d;
      ">
        <p>
          <strong style="color:#30d9ff;">Motivo de la llamada</strong>
        </p>
        <p>${escapeHtml(callReason)}</p>

        <p>
          <strong style="color:#30d9ff;">Próxima acción</strong>
        </p>
        <p>${escapeHtml(nextAction)}</p>

        <p>
          <strong style="color:#30d9ff;">Resumen</strong>
        </p>
        <p>${escapeHtml(callSummary)}</p>
      </div>

      <p style="
        margin-top: 24px;
        color: #a9bed1;
        font-size: 13px;
      ">
        Revisa el CRM de AxiomOS para continuar el seguimiento.
      </p>
    </div>
  `;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
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

  const result = await response.json();

  if (!response.ok) {
    console.error(
      "❌ Error enviando alerta por email:",
      result
    );

    throw new Error(
      `Resend email error: ${response.status}`
    );
  }

  console.log("✅ Alerta por email enviada correctamente.");

  return {
    sent: true,
    result,
  };
}