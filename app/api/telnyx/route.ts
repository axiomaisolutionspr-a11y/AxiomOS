import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendSmsAlert } from "../../lib/send-sms-alert";

export const runtime = "nodejs";

/* =========================================================
   AXIOMAI — HELPERS
   ========================================================= */

function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned || null;
}

function cleanCallerName(value: unknown): string | null {
  const text = textValue(value);

  if (!text) return null;

  if (
    /not provided|not specified|unknown|cannot be determined/i.test(text)
  ) {
    const fallback =
      text.match(
        /(?:caller's name is|caller name is|name is at least)\s*[:"]*\s*["']?([^"',.;\n]+)/i
      ) ?? null;

    if (fallback?.[1]) {
      return fallback[1].trim();
    }
  }

  const match =
    text.match(
      /(?:caller's full name is|caller(?:'s)? name is|full name is)\s*:?\s*["']?([^"',.;\n]+)/i
    ) ?? null;

  if (match?.[1]) {
    return match[1].trim();
  }

  if (text.length <= 80 && !text.includes(".")) {
    return text.replace(/^["']|["']$/g, "").trim();
  }

  return text;
}

function cleanBusinessName(value: unknown): string | null {
  const text = textValue(value);

  if (!text) return null;

  if (
    /not provided|not specified|unknown|no (?:specific )?(?:company|business) name/i.test(
      text
    )
  ) {
    return null;
  }

  const quotedMatch = text.match(
    /(?:company or business name is|business name is|company name is)\s*:?\s*["']([^"']+)["']/i
  );

  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  const match = text.match(
    /(?:company or business name is|business name is|company name is)\s*:?\s*([^,.;\n]+)/i
  );

  if (match?.[1]) {
    return match[1].replace(/^["']|["']$/g, "").trim();
  }

  if (text.length <= 120 && !text.includes(".")) {
    return text.replace(/^["']|["']$/g, "").trim();
  }

  return text;
}

function cleanNextAction(value: unknown): string | null {
  const text = textValue(value);

  if (!text) return null;

  const match = text.match(
    /most appropriate next action(?: after the call)? is\s*:?\s*([^.\n]+)/i
  );

  if (match?.[1]) {
    return match[1].trim();
  }

  const knownActions = [
    "Call Back",
    "Human Follow-up",
    "Follow-up",
    "Schedule Appointment",
    "Send Information",
    "Transfer",
    "No Follow-up",
  ];

  for (const action of knownActions) {
    if (text.toLowerCase().includes(action.toLowerCase())) {
      return action;
    }
  }

  return text;
}

function cleanReason(value: unknown): string | null {
  const text = textValue(value);

  if (!text) return null;

  const match = text.match(
    /(?:primary reason for (?:the )?(?:caller'?s )?call is|reason for the call is)\s*:?\s*(.+)$/i
  );

  if (match?.[1]) {
    return match[1].trim();
  }

  return text;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (!digits) return null;

  /*
    Para Estados Unidos y Puerto Rico usamos
    los últimos 10 dígitos como identidad.
  */
  return digits.slice(-10);
}

function buildProspectKey(
  callerPhone: string | null,
  conversationId: string
) {
  const normalizedPhone = normalizePhone(callerPhone);

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  /*
    Si no tenemos teléfono NO agrupamos personas
    desconocidas entre sí.
  */
  return `conversation:${conversationId}`;
}

/* =========================================================
   HEALTH CHECK
   ========================================================= */

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AxiomAI Telnyx Webhook",
    database: "Neon",
    crm: "Prospect Master",
    sms: process.env.SMS_ENABLED === "true"
      ? "enabled"
      : "disabled",
    status: "ready",
  });
}

/* =========================================================
   TELNYX WEBHOOK
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json();

    const eventType = webhook?.event_type ?? null;

    console.log("=== AXIOMAI TELNYX WEBHOOK ===");
    console.log("Event:", eventType);

    /*
      Solo procesamos los insights finales de la conversación.
    */
    if (eventType !== "conversation_insight_result") {
      return NextResponse.json(
        {
          ok: true,
          received: true,
          processed: false,
        },
        { status: 200 }
      );
    }

    const payload = webhook?.payload ?? {};

    const results = Array.isArray(payload?.results)
      ? payload.results
      : [];

    const metadata = payload?.metadata ?? {};

    const conversationId =
      textValue(payload?.conversation_id) ??
      textValue(metadata?.conversation_id);

    const callControlId =
      textValue(metadata?.call_control_id) ??
      textValue(payload?.call_control_id);

    const callerPhone =
      textValue(metadata?.from) ??
      textValue(metadata?.telnyx_end_user_target);

    /*
      Los resultados de Telnyx se interpretan
      según el orden configurado en Conversation Insights.
    */
    const nextAction = cleanNextAction(
      results?.[0]?.result
    );

    const callSummary = textValue(
      results?.[1]?.result
    );

    const callOutcome = textValue(
      results?.[2]?.result
    );

    const callClassification = textValue(
      results?.[3]?.result
    );

    const callReason = cleanReason(
      results?.[4]?.result
    );

    const callerCompany = cleanBusinessName(
      results?.[5]?.result
    );

    const callerName = cleanCallerName(
      results?.[6]?.result
    );

    /*
      Sin conversation_id no podemos deduplicar
      la llamada de forma segura.
    */
    if (!conversationId) {
      console.warn(
        "AxiomAI: conversation_insight_result without conversation_id"
      );

      return NextResponse.json(
        {
          ok: true,
          received: true,
          saved: false,
          reason: "missing_conversation_id",
        },
        { status: 200 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not configured"
      );
    }

    const sql = neon(databaseUrl);

    const prospectKey = buildProspectKey(
      callerPhone,
      conversationId
    );

    console.log(
      "Prospect key:",
      prospectKey
    );

    /*
      ======================================================
      1. BUSCAR O CREAR PROSPECTO MAESTRO
      ======================================================

      Si el teléfono ya existe:
      - NO crea otro prospecto.
      - Actualiza nombre/empresa si obtenemos información.
      - Conserva Estado, Responsable, Seguimiento y Notas.
      - Actualiza last_seen_at.
    */

    const prospectRows = await sql`
      INSERT INTO prospects (
        prospect_key,
        caller_name,
        caller_phone,
        caller_company,
        first_seen_at,
        last_seen_at,
        created_at,
        updated_at
      )
      VALUES (
        ${prospectKey},
        ${callerName},
        ${callerPhone},
        ${callerCompany},
        NOW(),
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (prospect_key)
      DO UPDATE SET
        caller_name = COALESCE(
          EXCLUDED.caller_name,
          prospects.caller_name
        ),
        caller_phone = COALESCE(
          EXCLUDED.caller_phone,
          prospects.caller_phone
        ),
        caller_company = COALESCE(
          EXCLUDED.caller_company,
          prospects.caller_company
        ),
        last_seen_at = NOW(),
        updated_at = NOW()
      RETURNING id
    `;

    const prospectId = prospectRows[0]?.id;

    if (!prospectId) {
      throw new Error(
        "Could not create or resolve master prospect"
      );
    }

    /*
      ======================================================
      2. GUARDAR LA LLAMADA EN EL HISTORIAL
      ======================================================

      Cada conversación tiene su propia fila.

      conversation_id evita que Telnyx genere
      registros duplicados si reintenta el webhook.
    */

    const insertedRows = await sql`
      INSERT INTO call_leads (
        caller_name,
        caller_phone,
        caller_company,
        call_reason,
        call_classification,
        call_summary,
        call_outcome,
        next_action,
        conversation_id,
        call_control_id,
        source,
        raw_payload,
        prospect_id
      )
      SELECT
        ${callerName},
        ${callerPhone},
        ${callerCompany},
        ${callReason},
        ${callClassification},
        ${callSummary},
        ${callOutcome},
        ${nextAction},
        ${conversationId},
        ${callControlId},
        ${"Telnyx AxiomAI Receptionist"},
        ${JSON.stringify(webhook)}::jsonb,
        ${prospectId}
      WHERE NOT EXISTS (
        SELECT 1
        FROM call_leads
        WHERE conversation_id = ${conversationId}
      )
      RETURNING id
    `;

    const saved =
      insertedRows.length > 0;

    /*
      ======================================================
      3. ALERTA SMS
      ======================================================

      MUY IMPORTANTE:

      Solo intentamos crear la alerta cuando
      realmente se guardó una llamada NUEVA.

      Si Telnyx reenvía el mismo webhook,
      saved será false y NO generaremos otra alerta.

      Además sendSmsAlert() verifica SMS_ENABLED.

      Mientras:
        SMS_ENABLED=false

      el sistema prepara la alerta pero NO envía SMS.
    */

    let smsAlert:
      | {
          sent: boolean;
          reason?: string;
          result?: unknown;
        }
      | null = null;

    if (saved) {
      console.log(
        "=== AXIOMAI CALL SAVED ===",
        insertedRows[0]?.id
      );

      console.log(
        "=== MASTER PROSPECT ===",
        prospectId
      );

      try {
        smsAlert = await sendSmsAlert({
          callerName,
          callerCompany,
          callerPhone,
          callReason,
        });

        if (smsAlert.sent) {
          console.log(
            "=== AXIOMAI SMS ALERT SENT ==="
          );
        } else {
          console.log(
            "=== AXIOMAI SMS ALERT NOT SENT ===",
            smsAlert.reason
          );
        }
      } catch (smsError) {
        /*
          Si en el futuro Telnyx SMS falla,
          NO queremos perder una llamada que
          ya quedó correctamente guardada en Neon.

          Por eso registramos el error pero
          mantenemos exitoso el webhook principal.
        */
        console.error(
          "AxiomAI SMS alert error:",
          smsError
        );

        smsAlert = {
          sent: false,
          reason: "SMS_ERROR",
        };
      }
    } else {
      console.log(
        "=== DUPLICATE CONVERSATION IGNORED ===",
        conversationId
      );
    }

    /*
      ======================================================
      4. RESPUESTA A TELNYX
      ======================================================
    */

    return NextResponse.json(
      {
        ok: true,
        received: true,
        processed: true,
        saved,
        prospect_id: prospectId,
        call_id:
          insertedRows[0]?.id ?? null,
        sms_alert: smsAlert,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "AxiomAI Telnyx webhook error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}