import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AxiomAI Telnyx Webhook",
    status: "ready",
  });
}

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json();

    console.log("=== AXIOMAI TELNYX WEBHOOK ===");
    console.log(JSON.stringify(webhook, null, 2));

    // Procesar únicamente los resultados de análisis
    // que Telnyx genera después de una conversación.
    if (webhook?.event_type === "conversation_insight_result") {
      const payload = webhook?.payload ?? {};
      const results = Array.isArray(payload?.results)
        ? payload.results
        : [];
      const metadata = payload?.metadata ?? {};

      const prospect = {
        conversationId: payload?.conversation_id ?? null,
        status: payload?.status ?? null,

        // Resultado 0
        nextAction: results?.[0]?.result ?? null,

        // Resultado 1
        summary: results?.[1]?.result ?? null,

        // Resultado 2
        callResult: results?.[2]?.result ?? null,

        // Resultado 3
        contactType: results?.[3]?.result ?? null,

        // Resultado 4
        reasonForCall: results?.[4]?.result ?? null,

        // Resultado 5
        businessName: results?.[5]?.result ?? null,

        // Resultado 6
        callerName: results?.[6]?.result ?? null,

        // Número de la persona que llamó
        callerPhone:
          metadata?.from ??
          metadata?.telnyx_end_user_target ??
          null,

        // Número de AxiomAI/Telnyx que recibió la llamada
        calledNumber:
          metadata?.to ??
          metadata?.telnyx_agent_target ??
          null,

        channel:
          metadata?.telnyx_conversation_channel ??
          "phone_call",

        receivedAt: new Date().toISOString(),
      };

      console.log("=== AXIOMAI PROSPECT ===");
      console.log(JSON.stringify(prospect, null, 2));
      console.log("=== END AXIOMAI PROSPECT ===");
    }

    console.log("=== END TELNYX WEBHOOK ===");

    return NextResponse.json(
      {
        ok: true,
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Telnyx webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook payload",
      },
      {
        status: 400,
      }
    );
  }
}