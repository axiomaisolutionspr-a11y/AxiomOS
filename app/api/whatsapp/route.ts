import {
  NextRequest,
  NextResponse,
} from "next/server";

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

const DUALHOOK_API_KEY =
  process.env.DUALHOOK_API_KEY;

const WHATSAPP_MAX_TEXT_LENGTH = 4000;

type BrainMessage = {
  role: "user" | "assistant";
  text: string;
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

/*
========================================================
DIVIDIR RESPUESTAS LARGAS DE WHATSAPP
========================================================
*/

function splitWhatsAppMessage(
  text: string,
  maxLength = WHATSAPP_MAX_TEXT_LENGTH
): string[] {
  const normalized = text
    .replace(/\r/g, "")
    .trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLength) {
    const candidate =
      remaining.slice(0, maxLength + 1);

    let splitAt =
      candidate.lastIndexOf("\n\n");

    if (splitAt < Math.floor(maxLength * 0.5)) {
      splitAt =
        candidate.lastIndexOf("\n");
    }

    if (splitAt < Math.floor(maxLength * 0.5)) {
      splitAt =
        candidate.lastIndexOf(" ");
    }

    if (splitAt <= 0) {
      splitAt = maxLength;
    }

    const chunk =
      remaining
        .slice(0, splitAt)
        .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    remaining =
      remaining
        .slice(splitAt)
        .trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

/*
========================================================
ENVIAR UN MENSAJE POR DUALHOOK
========================================================
*/

async function sendSingleWhatsAppMessage(
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

  const destination = normalizePhone(to);

  const response = await fetch(
    `https://api.dualhook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${DUALHOOK_API_KEY}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destination,
        type: "text",
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
    "DUALHOOK_OUTBOUND_STATUS:",
    response.status
  );

  console.log(
    "DUALHOOK_OUTBOUND_RESPONSE:",
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
ENVIAR RESPUESTA COMPLETA POR WHATSAPP
========================================================
*/

async function sendWhatsAppMessage(
  to: string,
  text: string
) {
  const chunks =
    splitWhatsAppMessage(text);

  if (chunks.length === 0) {
    throw new Error(
      "No hay texto utilizable para enviar por WhatsApp."
    );
  }

  console.log(
    "WHATSAPP_OUTBOUND_PARTS:",
    chunks.length
  );

  const responses: string[] = [];

  for (
    let index = 0;
    index < chunks.length;
    index += 1
  ) {
    console.log(
      "WHATSAPP_OUTBOUND_PART:",
      `${index + 1}/${chunks.length}`
    );

    const response =
      await sendSingleWhatsAppMessage(
        to,
        chunks[index]
      );

    responses.push(response);
  }

  return responses;
}

/*
========================================================
CONSULTAR AXIOMOS BRAIN
========================================================
*/

async function askBrain(
  request: NextRequest,
  messages: BrainMessage[]
) {
  const brainUrl = new URL(
    "/api/brain",
    request.url
  );

  const response = await fetch(
    brainUrl,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        messages,
        channel: "whatsapp",
      }),
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as {
      result?: unknown;
      error?: unknown;
    };

  if (!response.ok) {
    const errorText =
      typeof data.error === "string"
        ? data.error
        : "Brain no pudo responder.";

    throw new Error(
      `Brain error ${response.status}: ${errorText}`
    );
  }

  if (
    typeof data.result !== "string" ||
    !data.result.trim()
  ) {
    throw new Error(
      "Brain respondió sin texto utilizable."
    );
  }

  return data.result.trim();
}

/*
========================================================
VERIFICACIÓN DEL WEBHOOK
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
    searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    searchParams.get(
      "hub.challenge"
    );

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
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
RECIBIR MENSAJES DE WHATSAPP
========================================================
*/

export async function POST(
  request: NextRequest
) {
  try {
    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not configured"
      );
    }

    const sql = neon(databaseUrl);

    const body =
      await request.json();

    const entries =
      Array.isArray(body?.entry)
        ? body.entry
        : [];

    let messagesReceived = 0;
    let repliesSent = 0;

    const errors: string[] = [];

    console.log(
      "WHATSAPP_ENTRIES:",
      entries.length
    );

    for (const entry of entries) {
      const changes =
        Array.isArray(entry?.changes)
          ? entry.changes
          : [];

      for (const change of changes) {
        const messages =
          Array.isArray(
            change?.value?.messages
          )
            ? change.value.messages
            : [];

        console.log(
          "WHATSAPP_MESSAGES_IN_EVENT:",
          messages.length
        );

        for (const message of messages) {
          const from =
            typeof message?.from ===
            "string"
              ? message.from
              : "";

          const text =
            typeof message?.text?.body ===
            "string"
              ? message.text.body.trim()
              : "";

          const whatsappMessageId =
            typeof message?.id ===
            "string"
              ? message.id
              : null;

          if (
            !from ||
            message?.type !== "text" ||
            !text
          ) {
            continue;
          }

          messagesReceived++;

          const phone =
            normalizePhone(from);

          const conversationKey =
            `whatsapp:${phone}`;

          console.log(
            "WHATSAPP_INCOMING_FROM:",
            phone
          );

          console.log(
            "WHATSAPP_INCOMING_TEXT:",
            text
          );

          try {
            /*
            ================================================
            EVITAR MENSAJES DUPLICADOS
            ================================================
            */

            if (whatsappMessageId) {
              const duplicate =
                await sql`
                  SELECT id
                  FROM whatsapp_messages
                  WHERE whatsapp_message_id =
                    ${whatsappMessageId}
                  LIMIT 1
                `;

              if (
                duplicate.length > 0
              ) {
                console.log(
                  "WHATSAPP_DUPLICATE_SKIPPED:",
                  whatsappMessageId
                );

                continue;
              }
            }

            /*
            ================================================
            GUARDAR MENSAJE DEL CLIENTE
            ================================================
            */

            await sql`
              INSERT INTO whatsapp_messages (
                conversation_key,
                phone,
                role,
                message,
                whatsapp_message_id
              )
              VALUES (
                ${conversationKey},
                ${phone},
                ${"user"},
                ${text},
                ${whatsappMessageId}
              )
            `;

            /*
            ================================================
            RECUPERAR HISTORIAL
            ================================================
            */

            const historyRows =
              await sql`
                SELECT
                  role,
                  message
                FROM whatsapp_messages
                WHERE conversation_key =
                  ${conversationKey}
                ORDER BY
                  created_at DESC,
                  id DESC
                LIMIT 12
              `;

            const history:
              BrainMessage[] =
                historyRows
                  .slice()
                  .reverse()
                  .filter(
                    (row) =>
                      (
                        row.role ===
                          "user" ||
                        row.role ===
                          "assistant"
                      ) &&
                      typeof row.message ===
                        "string"
                  )
                  .map((row) => ({
                    role:
                      row.role as
                        | "user"
                        | "assistant",
                    text: row.message,
                  }));

            console.log(
              "WHATSAPP_HISTORY_ITEMS:",
              history.length
            );

            /*
            ================================================
            CONSULTAR BRAIN
            ================================================
            */

            const brainReply =
              await askBrain(
                request,
                history
              );

            console.log(
              "WHATSAPP_BRAIN_REPLY:",
              brainReply
            );

            /*
            ================================================
            ENVIAR RESPUESTA POR WHATSAPP
            ================================================
            */

            await sendWhatsAppMessage(
              phone,
              brainReply
            );

            /*
            ================================================
            GUARDAR RESPUESTA COMPLETA DE BRAIN
            ================================================
            */

            await sql`
              INSERT INTO whatsapp_messages (
                conversation_key,
                phone,
                role,
                message
              )
              VALUES (
                ${conversationKey},
                ${phone},
                ${"assistant"},
                ${brainReply}
              )
            `;

            repliesSent++;

            console.log(
              "AXIOMAI_BRAIN_REPLY_SENT"
            );
          } catch (error) {
            const messageError =
              error instanceof Error
                ? error.message
                : "Unknown processing error";

            errors.push(
              messageError
            );

            console.error(
              "AXIOMAI_WHATSAPP_PROCESSING_ERROR:",
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
      {
        status: 200,
      }
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
      {
        status: 200,
      }
    );
  }
}