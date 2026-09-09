async function iniciarLlamadaAxiomAI(formData: FormData) {
  "use server";

  console.log("=== AXIOMOS OUTBOUND: INICIO ===");

  const apiKey = process.env.TELNYX_API_KEY;
  const texmlAppId = process.env.TELNYX_TEXML_APP_ID;
  const assistantId = process.env.TELNYX_AI_ASSISTANT_ID;
  const fromNumber = process.env.TELNYX_FROM_NUMBER;
  const crmCallPin = process.env.AXIOMOS_CRM_CALL_PIN;
  const databaseUrl = process.env.DATABASE_URL;

  if (!apiKey) {
    console.error("AXIOMOS OUTBOUND ERROR: falta TELNYX_API_KEY.");
    throw new Error("Falta TELNYX_API_KEY.");
  }

  if (!texmlAppId) {
    console.error("AXIOMOS OUTBOUND ERROR: falta TELNYX_TEXML_APP_ID.");
    throw new Error("Falta TELNYX_TEXML_APP_ID.");
  }

  if (!assistantId) {
    console.error("AXIOMOS OUTBOUND ERROR: falta TELNYX_AI_ASSISTANT_ID.");
    throw new Error("Falta TELNYX_AI_ASSISTANT_ID.");
  }

  if (!fromNumber) {
    console.error("AXIOMOS OUTBOUND ERROR: falta TELNYX_FROM_NUMBER.");
    throw new Error("Falta TELNYX_FROM_NUMBER.");
  }

  if (!crmCallPin) {
    console.error("AXIOMOS OUTBOUND ERROR: falta AXIOMOS_CRM_CALL_PIN.");
    throw new Error("Falta AXIOMOS_CRM_CALL_PIN.");
  }

  if (!databaseUrl) {
    console.error("AXIOMOS OUTBOUND ERROR: falta DATABASE_URL.");
    throw new Error("Falta DATABASE_URL.");
  }

  const pin = String(formData.get("crm_call_pin") || "").trim();

  if (!pin) {
    console.error("AXIOMOS OUTBOUND ERROR: no se recibió PIN.");
    throw new Error("Debes ingresar el PIN de llamada.");
  }

  if (pin !== crmCallPin) {
    console.error("AXIOMOS OUTBOUND ERROR: PIN incorrecto.");
    throw new Error("PIN de llamadas incorrecto.");
  }

  const prospectoId = String(formData.get("id") || "").trim();

  if (!/^\d+$/.test(prospectoId)) {
    console.error(
      "AXIOMOS OUTBOUND ERROR: ID de prospecto inválido:",
      prospectoId
    );
    throw new Error("ID de prospecto inválido.");
  }

  let telefono: string;

  try {
    telefono = telefonoE164(
      String(formData.get("caller_phone") || "")
    );
  } catch (error) {
    console.error(
      "AXIOMOS OUTBOUND ERROR: teléfono de prospecto inválido.",
      error
    );
    throw error;
  }

  let numeroOrigen: string;

  try {
    numeroOrigen = telefonoE164(fromNumber);
  } catch (error) {
    console.error(
      "AXIOMOS OUTBOUND ERROR: TELNYX_FROM_NUMBER inválido.",
      error
    );
    throw error;
  }

  const sql = neon(databaseUrl);

  const registros = (await sql`
    SELECT
      caller_name,
      caller_company,
      crm_notes
    FROM prospects
    WHERE id = ${prospectoId}
    LIMIT 1
  `) as Array<{
    caller_name: string | null;
    caller_company: string | null;
    crm_notes: string | null;
  }>;

  const prospecto = registros[0];

  if (!prospecto) {
    console.error(
      "AXIOMOS OUTBOUND ERROR: prospecto no encontrado:",
      prospectoId
    );
    throw new Error("No se encontró el prospecto.");
  }

  const prospectoNombre =
    prospecto.caller_name?.trim() || "cliente";

  const prospectoEmpresa =
    prospecto.caller_company?.trim() || "";

  const prospectoNotas =
    prospecto.crm_notes?.trim() || "";

  const saludoSaliente = prospectoEmpresa
    ? `Hola ${prospectoNombre}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios para ${prospectoEmpresa}. ¿Tienes un momento para conversar?`
    : `Hola ${prospectoNombre}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios. ¿Tienes un momento para conversar?`;

  console.log(
    "AXIOMOS OUTBOUND: preflight correcto.",
    {
      prospectoId,
      telefono,
      tieneNombre: Boolean(prospecto.caller_name),
      tieneEmpresa: Boolean(prospecto.caller_company),
      tieneNotas: Boolean(prospecto.crm_notes),
      assistantConfigurado: Boolean(assistantId),
      texmlConfigurado: Boolean(texmlAppId),
    }
  );

  let response: Response;

  try {
    response = await fetch(
      `https://api.telnyx.com/v2/texml/ai_calls/${encodeURIComponent(
        texmlAppId
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: numeroOrigen,
          To: telefono,
          AIAssistantId: assistantId,
          AIAssistantDynamicVariables: {
            call_direction: "outbound",
            prospect_id: prospectoId,
            prospect_name: prospectoNombre,
            prospect_company:
              prospectoEmpresa || "No disponible",
            crm_notes:
              prospectoNotas ||
              "No hay notas internas disponibles",
            outbound_greeting: saludoSaliente,
          },
        }),
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "AXIOMOS OUTBOUND ERROR: no se pudo conectar con la API de Telnyx.",
      error
    );

    throw new Error(
      "No se pudo conectar con Telnyx para iniciar la llamada."
    );
  }

  const raw = await response.text();

  console.log(
    "AXIOMOS OUTBOUND: respuesta de Telnyx.",
    {
      status: response.status,
      ok: response.ok,
      body: raw,
    }
  );

  if (!response.ok) {
    console.error(
      "TELNYX OUTBOUND AI CALL FAILED:",
      response.status,
      raw
    );

    throw new Error(
      `Telnyx rechazó la llamada saliente (${response.status}).`
    );
  }

  console.log(
    "AXIOMOS OUTBOUND AI CALL STARTED:",
    {
      prospectoId,
      telefono,
      status: response.status,
      telnyxResponse: raw,
    }
  );

  revalidatePath("/prospectos");
}