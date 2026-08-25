import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

/* =========================================================
   AXIOMAI — HELPERS PARA LIMPIAR LOS INSIGHTS DE TELNYX
   ========================================================= */

function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  if (!cleaned) return null;

  return cleaned;
}

function cleanCallerName(value: unknown): string | null {
  const text = textValue(value);

  if (!text) return null;

  if (
    /not provided|not specified|unknown|cannot be determined/i.test(text)
  ) {
    /*
      Algunos insights contienen una explicación larga aunque sí hayan
      identificado al menos el primer nombre. Intentamos recuperarlo.
    */
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

  // Si Telnyx devuelve solamente el nombre.
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

  if (text.length <= 100) {
    return text;
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

/* =========================================================
   HEALTH CHECK
   ========================================================= */

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AxiomAI Telnyx Webhook",
    database: "Neon",
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
      Solo creamos un registro cuando Telnyx termina
      de generar los Conversation Insights.
    */
    if (eventType === "conversation_insight_result") {
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
        Estos índices corresponden al Insight Group
        configurado actualmente en el AxiomAI Receptionist.
      */

      const nextAction = cleanNextAction(results?.[0]?.result);

      const callSummary = textValue(results?.[1]?.result);

      const callOutcome = textValue(results?.[2]?.result);

      const callClassification = textValue(results?.[3]?.result);

      const callReason = cleanReason(results?.[4]?.result);

      const callerCompany = cleanBusinessName(results?.[5]?.result);

      const callerName = cleanCallerName(results?.[6]?.result);

      const prospect = {
        conversationId,
        callControlId,
        callerName,
        callerPhone,
        callerCompany,
        callReason,
        callClassification,
        callSummary,
        callOutcome,
        nextAction,
      };

      console.log("=== AXIOMAI CLEAN PROSPECT ===");
      console.log(JSON.stringify(prospect, null, 2));

      /*
        Conversation Insight Result normalmente debe incluir
        conversation_id. Si no viene, no insertamos un registro
        incompleto.
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
        throw new Error("DATABASE_URL is not configured");
      }

      const sql = neon(databaseUrl);

      /*
        Guardamos el prospecto en Neon.

        WHERE NOT EXISTS evita crear dos registros si Telnyx
        reintenta el mismo webhook.
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
          raw_payload
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
          ${JSON.stringify(webhook)}::jsonb
        WHERE NOT EXISTS (
          SELECT 1
          FROM call_leads
          WHERE conversation_id = ${conversationId}
        )
        RETURNING id
      `;

      const saved = insertedRows.length > 0;

      if (saved) {
        console.log(
          "=== AXIOMAI LEAD SAVED ===",
          insertedRows[0]?.id
        );
      } else {
        console.log(
          "=== AXIOMAI DUPLICATE IGNORED ===",
          conversationId
        );
      }

      console.log("=== END AXIOMAI PROSPECT ===");

      return NextResponse.json(
        {
          ok: true,
          received: true,
          processed: true,
          saved,
        },
        { status: 200 }
      );
    }

    /*
      Los demás eventos de Telnyx siguen recibiendo 200
      para que Telnyx sepa que fueron recibidos.
    */

    console.log("=== END TELNYX WEBHOOK ===");

    return NextResponse.json(
      {
        ok: true,
        received: true,
        processed: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("AxiomAI Telnyx webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}