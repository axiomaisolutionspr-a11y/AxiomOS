import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";

/*
========================================================
AXIOMAI WHATSAPP WEBHOOK
========================================================
*/

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

const DUALHOOK_API_KEY =
  process.env.DUALHOOK_API_KEY;


/*
========================================================
GET - VERIFICACIÓN DEL WEBHOOK
========================================================
*/

export async function GET(
  request: NextRequest
) {
  const { searchParams } =
    new URL(request.url);

  const mode =
    searchParams.get("hub.mode");

  const token =
    searchParams.get("hub.verify_token");

  const challenge =
    searchParams.get("hub.challenge");

  console.log(
    "=== AXIOMAI WHATSAPP VERIFICATION ==="
  );

  if (!VERIFY_TOKEN) {
    console.error(
      "WHATSAPP_VERIFY_TOKEN is not configured"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "WHATSAPP_VERIFY_TOKEN is not configured",
      },
      {
        status: 500,
      }
    );
  }

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    console.log(
      "WhatsApp webhook verified successfully"
    );

    return new NextResponse(
      challenge,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
        },
      }
    );
  }

  console.warn(
    "WhatsApp webhook verification rejected"
  );

  return NextResponse.json(
    {
      ok: false,
      error:
        "Webhook verification failed",
    },
    {
      status: 403,
    }
  );
}


/*
========================================================
ENVIAR MENSAJE POR DUALHOOK
========================================================
*/

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

  const endpoint =
    `https://api.dualhook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

  console.log(
    "Sending WhatsApp message to:",
    to
  );

  const response = await fetch(
    endpoint,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${DUALHOOK_API_KEY}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        messaging_product:
          "whatsapp",

        recipient_type:
          "individual",

        to,

        type:
          "text",

        text: {
          preview_url: false,
          body: text,
        },
      }),
    }
  );

  const responseBody =
    await response.text();

  console.log(
    "Dualhook status:",
    response.status
  );

  console.log(
    "Dualhook response:",
    responseBody
  );

  if (!response.ok) {
    throw new Error(
      `Dualhook error ${response.status}: ${responseBody}`
    );
  }

  return responseBody;
}


/*
========================================================
POST - EVENTOS ENTRANTES DE WHATSAPP
========================================================
*/

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    console.log(
      "=== AXIOMAI WHATSAPP EVENT RECEIVED ==="
    );

    console.log(
      "Object:",
      body?.object ?? "unknown"
    );

    const entries =
      Array.isArray(body?.entry)
        ? body.entry
        : [];

    console.log(
      "Entries count:",
      entries.length
    );

    let messagesProcessed = 0;

    for (const entry of entries) {

      const changes =
        Array.isArray(entry?.changes)
          ? entry.changes
          : [];

      console.log(
        "Changes count:",
        changes.length
      );

      for (const change of changes) {

        /*
        ========================================================
        DIAGNÓSTICO TEMPORAL DEL EVENTO DE META
        ========================================================

        Esto nos permite identificar si Meta está enviando:
        - messages
        - statuses
        - smb_message_echoes
        - history
        - smb_app_state_sync
        - u otro evento

        No imprimimos tokens ni API keys.
        */

        const field =
          change?.field ??
          "unknown";

        const value =
          change?.value;

        console.log(
          "Webhook field:",
          field
        );

        const valueKeys =
          value &&
          typeof value === "object"
            ? Object.keys(value)
            : [];

        console.log(
          "Webhook value keys:",
          valueKeys.join(", ") ||
            "none"
        );

        const messages =
          Array.isArray(
            value?.messages
          )
            ? value.messages
            : [];

        const statuses =
          Array.isArray(
            value?.statuses
          )
            ? value.statuses
            : [];

        console.log(
          "Messages count:",
          messages.length
        );

        console.log(
          "Statuses count:",
          statuses.length
        );

        console.log(
          "Has metadata:",
          Boolean(value?.metadata)
        );

        /*
        ========================================================
        PROCESAR MENSAJES ENTRANTES
        ========================================================
        */

        for (
          const message of messages
        ) {

          const from =
            message?.from;

          const type =
            message?.type;

          console.log(
            "Incoming message type:",
            type ?? "unknown"
          );

          if (!from) {
            console.log(
              "Ignoring WhatsApp message without sender"
            );

            continue;
          }

          /*
          ================================================
          POR AHORA CONTESTAMOS SOLAMENTE TEXTO
          ================================================
          */

          if (type !== "text") {
            console.log(
              "Ignoring non-text WhatsApp message:",
              type
            );

            continue;
          }

          const incomingText =
            message?.text?.body
              ?.trim();

          if (!incomingText) {
            console.log(
              "Ignoring empty WhatsApp text message"
            );

            continue;
          }

          console.log(
            "WhatsApp sender:",
            from
          );

          console.log(
            "WhatsApp message:",
            incomingText
          );


          /*
          ================================================
          RESPUESTA AUTOMÁTICA DE PRUEBA
          ================================================

          Una vez comprobemos que esto funciona,
          conectaremos aquí la IA de AxiomAI.
          */

          const reply =
            "¡Hola! 👋 Gracias por comunicarte con AxiomAI Solutions.\n\n" +
            "Soy el asistente virtual de AxiomAI. Podemos ayudarte a automatizar llamadas, WhatsApp, seguimiento de clientes, prospectos y otros procesos de tu negocio utilizando inteligencia artificial.\n\n" +
            "Cuéntame brevemente qué tipo de negocio tienes y qué te gustaría automatizar.";

          await sendWhatsAppMessage(
            from,
            reply
          );

          messagesProcessed++;

          console.log(
            "AxiomAI WhatsApp reply sent successfully"
          );
        }
      }
    }


    /*
    ======================================================
    META NECESITA RESPUESTA RÁPIDA 200
    ======================================================
    */

    console.log(
      "Webhook processing finished. Messages processed:",
      messagesProcessed
    );

    return NextResponse.json(
      {
        ok: true,
        received: true,
        messagesProcessed,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "AxiomAI WhatsApp webhook error:",
      error
    );

    /*
    Durante las pruebas devolvemos 200 para evitar
    reintentos repetidos del mismo webhook.
    */

    return NextResponse.json(
      {
        ok: false,
        received: true,
        error:
          error instanceof Error
            ? error.message
            : "Unknown webhook error",
      },
      {
        status: 200,
      }
    );
  }
}