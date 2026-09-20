import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

const DUALHOOK_API_KEY =
  process.env.DUALHOOK_API_KEY;

async function sendWhatsAppMessage(
  to: string,
  text: string
) {
  if (!PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID is not configured"
    );
  }

  if (!DUALHOOK_API_KEY) {
    throw new Error(
      "DUALHOOK_API_KEY is not configured"
    );
  }

  const destination = to.replace(/\D/g, "");

  const response = await fetch(
    `https://api.dualhook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DUALHOOK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destination,
        type: "text",
        text: {
          preview_url: false,
          body:
            "¡Hola! 👋 Gracias por comunicarte con AxiomAI Solutions.\n\n" +
            "Soy el asistente virtual de AxiomAI. Podemos ayudarte a automatizar llamadas, WhatsApp, seguimiento de clientes y prospectos.\n\n" +
            "Cuéntame qué tipo de negocio tienes y qué te gustaría automatizar.",
        },
      }),
    }
  );

  const responseBody = await response.text();

  console.log("DUALHOOK_OUTBOUND_STATUS:", response.status);
  console.log("DUALHOOK_OUTBOUND_RESPONSE:", responseBody);

  if (!response.ok) {
    throw new Error(
      `Dualhook error ${response.status}: ${responseBody}`
    );
  }

  return responseBody;
}

export async function GET(
  request: NextRequest
) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: "Webhook verification failed" },
    { status: 403 }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const entries = Array.isArray(body?.entry)
      ? body.entry
      : [];

    let messagesReceived = 0;
    let repliesSent = 0;
    const errors: string[] = [];

    console.log("WHATSAPP_ENTRIES:", entries.length);

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes)
        ? entry.changes
        : [];

      for (const change of changes) {
        const messages = Array.isArray(
          change?.value?.messages
        )
          ? change.value.messages
          : [];

        console.log(
          "WHATSAPP_MESSAGES_IN_EVENT:",
          messages.length
        );

        for (const message of messages) {
          const from = message?.from;
          const text = message?.text?.body?.trim();

          if (!from || message?.type !== "text" || !text) {
            continue;
          }

          messagesReceived++;

          console.log("WHATSAPP_INCOMING_FROM:", from);
          console.log("WHATSAPP_INCOMING_TEXT:", text);

          try {
            await sendWhatsAppMessage(from, text);
            repliesSent++;
            console.log("AXIOMAI_REPLY_SENT");
          } catch (error) {
            const messageError =
              error instanceof Error
                ? error.message
                : "Unknown outbound error";

            errors.push(messageError);
            console.error(
              "AXIOMAI_AUTO_REPLY_ERROR:",
              messageError
            );
          }
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        messagesReceived,
        repliesSent,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    const messageError =
      error instanceof Error
        ? error.message
        : "Unknown webhook error";

    console.error(
      "AXIOMAI_WEBHOOK_ERROR:",
      messageError
    );

    return NextResponse.json(
      {
        ok: false,
        error: messageError,
      },
      { status: 200 }
    );
  }
}