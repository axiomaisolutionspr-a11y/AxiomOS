import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
  ============================================================
  AXIOMAI WHATSAPP WEBHOOK
  ============================================================

  GET
  Meta utiliza esta ruta para verificar el webhook.

  POST
  Meta / Dualhook enviará aquí los eventos de WhatsApp.
*/

/* =========================================================
   VERIFICACIÓN DE META
   ========================================================= */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error(
      "WHATSAPP_VERIFY_TOKEN is not configured"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook verify token not configured",
      },
      { status: 500 }
    );
  }

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    console.log(
      "=== AXIOMAI WHATSAPP WEBHOOK VERIFIED ==="
    );

    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  console.warn(
    "=== AXIOMAI WHATSAPP VERIFICATION FAILED ==="
  );

  return NextResponse.json(
    {
      ok: false,
      error: "Verification failed",
    },
    { status: 403 }
  );
}

/* =========================================================
   EVENTOS DE WHATSAPP
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "=== AXIOMAI WHATSAPP EVENT RECEIVED ==="
    );

    console.log(
      "Object:",
      body?.object ?? "unknown"
    );

    return NextResponse.json(
      {
        ok: true,
        received: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "AxiomAI WhatsApp webhook error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook payload",
      },
      { status: 400 }
    );
  }
}