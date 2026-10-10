import {
  NextRequest,
  NextResponse,
} from "next/server";

import { neon } from "@neondatabase/serverless";
import { registerWhatsAppContact } from "../../lib/whatsapp-contact-request";

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

type WhatsAppRecipient =
  | {
      kind: "phone";
      value: string;
    }
  | {
      kind: "bsuid";
      value: string;
    };

type MetaApiErrorEnvelope = {
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
    error_subcode?: unknown;
    fbtrace_id?: unknown;
    error_data?: {
      details?: unknown;
      messaging_product?: unknown;
    };
  };
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeBsuid(value: string) {
  return value.trim();
}

function normalizeConversationCommand(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isConversationResetCommand(
  value: string
) {
  const command =
    normalizeConversationCommand(value);

  return (
    command === "#nueva_conversacion" ||
    command === "#nueva-conversacion" ||
    command === "#reset"
  );
}

function buildBrainHistory(
  rows: Array<{
    role?: unknown;
    message?: unknown;
  }>
): BrainMessage[] {
  const chronological =
    rows
      .slice()
      .reverse()
      .filter(
        (row) =>
          (
            row.role === "user" ||
            row.role === "assistant"
          ) &&
          typeof row.message === "string"
      )
      .map((row) => ({
        role:
          row.role as
            | "user"
            | "assistant",
        text: row.message as string,
      }));

  let lastResetIndex = -1;

  for (
    let index = 0;
    index < chronological.length;
    index += 1
  ) {
    const item = chronological[index];

    if (
      item.role === "user" &&
      isConversationResetCommand(item.text)
    ) {
      lastResetIndex = index;
    }
  }

  return chronological.slice(
    lastResetIndex + 1
  );
}

function readMetaApiError(responseBody: string) {
  try {
    const parsed =
      JSON.parse(responseBody) as MetaApiErrorEnvelope;

    const error = parsed?.error;

    if (!error) {
      return null;
    }

    return {
      code:
        typeof error.code === "number"
          ? error.code
          : null,
      subcode:
        typeof error.error_subcode === "number"
          ? error.error_subcode
          : null,
      type:
        typeof error.type === "string"
          ? error.type
          : null,
      message:
        typeof error.message === "string"
          ? error.message
          : null,
      details:
        typeof error.error_data?.details === "string"
          ? error.error_data.details
          : null,
      messagingProduct:
        typeof error.error_data?.messaging_product === "string"
          ? error.error_data.messaging_product
          : null,
      fbtraceId:
        typeof error.fbtrace_id === "string"
          ? error.fbtrace_id
          : null,
    };
  } catch {
    return null;
  }
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
  recipient: WhatsAppRecipient,
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

  const destination =
    recipient.kind === "phone"
      ? normalizePhone(recipient.value)
      : normalizeBsuid(recipient.value);

  if (!destination) {
    throw new Error(
      "WhatsApp recipient identifier is empty"
    );
  }

  const recipientFields =
    recipient.kind === "phone"
      ? {
          to: destination,
        }
      : {
          recipient: destination,
        };

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
        ...recipientFields,
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
    const metaError =
      readMetaApiError(responseBody);

    console.error(
      "DUALHOOK_OUTBOUND_ERROR_DETAILS:",
      {
        httpStatus: response.status,
        recipientKind: recipient.kind,
        metaCode:
          metaError?.code ?? null,
        metaSubcode:
          metaError?.subcode ?? null,
        metaType:
          metaError?.type ?? null,
        metaMessage:
          metaError?.message ?? null,
        details:
          metaError?.details ?? null,
        messagingProduct:
          metaError?.messagingProduct ?? null,
        fbtraceId:
          metaError?.fbtraceId ?? null,
      }
    );

    const diagnostic =
      metaError?.details ||
      metaError?.message ||
      responseBody;

    throw new Error(
      `Dualhook error ${response.status}${metaError?.code ? ` / Meta #${metaError.code}` : ""}: ${diagnostic}`
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
  recipient: WhatsAppRecipient,
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
        recipient,
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

        const contacts =
          Array.isArray(
            change?.value?.contacts
          )
            ? change.value.contacts
            : [];

        const statuses =
          Array.isArray(
            change?.value?.statuses
          )
            ? change.value.statuses
            : [];

        console.log(
          "WHATSAPP_MESSAGES_IN_EVENT:",
          messages.length
        );

        for (const status of statuses) {
          const statusErrors =
            Array.isArray(status?.errors)
              ? status.errors
              : [];

          if (statusErrors.length > 0) {
            console.error(
              "WHATSAPP_STATUS_ERROR:",
              {
                messageId:
                  typeof status?.id === "string"
                    ? status.id
                    : null,
                status:
                  typeof status?.status === "string"
                    ? status.status
                    : null,
                recipientId:
                  typeof status?.recipient_id === "string"
                    ? status.recipient_id
                    : null,
                recipientUserId:
                  typeof status?.recipient_user_id === "string"
                    ? status.recipient_user_id
                    : null,
                errors: statusErrors,
              }
            );
          }
        }

        for (const message of messages) {
          const fromPhoneRaw =
            typeof message?.from ===
            "string"
              ? message.from
              : "";

          const messageUserId =
            typeof message?.from_user_id ===
            "string"
              ? message.from_user_id.trim()
              : "";

          const matchingContact =
            contacts.find(
              (contact: {
                wa_id?: unknown;
                user_id?: unknown;
              }) =>
                (
                  fromPhoneRaw &&
                  contact?.wa_id ===
                    fromPhoneRaw
                ) ||
                (
                  messageUserId &&
                  contact?.user_id ===
                    messageUserId
                )
            ) ??
            contacts[0];

          const contactWaId =
            typeof matchingContact?.wa_id ===
            "string"
              ? matchingContact.wa_id
              : "";

          const contactUserId =
            typeof matchingContact?.user_id ===
            "string"
              ? matchingContact.user_id.trim()
              : "";

          const phone =
            normalizePhone(
              fromPhoneRaw ||
              contactWaId
            );

          const userId =
            messageUserId ||
            contactUserId;

          const incomingText = message?.text?.body
            ?? message?.button?.text
            ?? message?.interactive?.button_reply?.title
            ?? message?.interactive?.list_reply?.title;
          const mediaLabels: Record<string, string> = {
            image: "Imagen recibida", audio: "Nota de voz recibida",
            video: "Video recibido", document: "Documento recibido",
            sticker: "Sticker recibido", location: "Ubicación recibida",
            contacts: "Contacto recibido",
          };
          const isConversationalText = typeof incomingText === "string" && Boolean(incomingText.trim());
          const caption = message?.image?.caption ?? message?.video?.caption ?? message?.document?.caption;
          const text = isConversationalText ? incomingText.trim()
            : mediaLabels[message?.type]
              ? `[${mediaLabels[message.type]}]${typeof caption === "string" ? ` ${caption.trim()}` : ""}`
              : "";

          const whatsappMessageId =
            typeof message?.id ===
            "string"
              ? message.id
              : null;

          const recipient:
            WhatsAppRecipient | null =
              phone
                ? {
                    kind: "phone",
                    value: phone,
                  }
                : userId
                  ? {
                      kind: "bsuid",
                      value: userId,
                    }
                  : null;

          if (
            !recipient ||
            !text
          ) {
            if (!recipient && text) {
              console.error(
                "WHATSAPP_INCOMING_IDENTITY_MISSING:",
                {
                  whatsappMessageId,
                  hasFrom:
                    Boolean(fromPhoneRaw),
                  hasFromUserId:
                    Boolean(messageUserId),
                  hasWaId:
                    Boolean(contactWaId),
                  hasUserId:
                    Boolean(contactUserId),
                }
              );
            }

            continue;
          }

          messagesReceived++;

          const legacyConversationKey =
            phone
              ? `whatsapp:${phone}`
              : null;

          const bsuidConversationKey =
            userId
              ? `whatsapp:bsuid:${userId}`
              : null;

          const conversationKey =
            bsuidConversationKey ||
            legacyConversationKey!;

          const storedIdentity =
            phone ||
            `bsuid:${userId}`;

          console.log(
            "WHATSAPP_INCOMING_IDENTITY:",
            {
              phone:
                phone || null,
              userId:
                userId || null,
              recipientKind:
                recipient.kind,
            }
          );

          if (!phone && userId) {
            console.log(
              "WHATSAPP_BSUID_WITHOUT_PHONE:",
              userId
            );
          }


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

                const retryRows =
                  legacyConversationKey &&
                  legacyConversationKey !==
                    conversationKey
                    ? await sql`
                        SELECT role, message
                        FROM whatsapp_messages
                        WHERE conversation_key IN (
                          ${conversationKey},
                          ${legacyConversationKey}
                        )
                        ORDER BY created_at DESC, id DESC
                        LIMIT 12
                      `
                    : await sql`
                        SELECT role, message
                        FROM whatsapp_messages
                        WHERE conversation_key =
                          ${conversationKey}
                        ORDER BY created_at DESC, id DESC
                        LIMIT 12
                      `;

                const retryHistory =
                  buildBrainHistory(
                    retryRows as Array<{
                      role?: unknown;
                      message?: unknown;
                    }>
                  );

                if (
                  phone &&
                  !isConversationResetCommand(
                    text
                  )
                ) {
                  await registerWhatsAppContact({
                    phone,
                    text,
                    messageId:
                      whatsappMessageId,
                    history:
                      retryHistory,
                  });
                }

                continue;
              }
            }

            /*
            ================================================
            NUEVA CONVERSACIÓN SIN BORRAR HISTORIAL
            ================================================
            */

            if (
              isConversationResetCommand(
                text
              )
            ) {
              const resetReply =
                "Listo. Empezamos una conversación nueva. El historial anterior se conserva en AxiomOS, pero Brain no lo usará como contexto desde este punto.";

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
                  ${storedIdentity},
                  ${"user"},
                  ${text},
                  ${whatsappMessageId}
                )
              `;

              await sendWhatsAppMessage(
                recipient,
                resetReply
              );

              await sql`
                INSERT INTO whatsapp_messages (
                  conversation_key,
                  phone,
                  role,
                  message
                )
                VALUES (
                  ${conversationKey},
                  ${storedIdentity},
                  ${"assistant"},
                  ${resetReply}
                )
              `;

              repliesSent++;

              console.log(
                "WHATSAPP_CONVERSATION_RESET:",
                {
                  conversationKey,
                  phone:
                    phone || null,
                  userId:
                    userId || null,
                }
              );

              continue;
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
                ${storedIdentity},
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
              legacyConversationKey &&
              legacyConversationKey !==
                conversationKey
                ? await sql`
                    SELECT
                      role,
                      message
                    FROM whatsapp_messages
                    WHERE conversation_key IN (
                      ${conversationKey},
                      ${legacyConversationKey}
                    )
                    ORDER BY
                      created_at DESC,
                      id DESC
                    LIMIT 12
                  `
                : await sql`
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

            const history =
              buildBrainHistory(
                historyRows as Array<{
                  role?: unknown;
                  message?: unknown;
                }>
              );

            console.log(
              "WHATSAPP_HISTORY_ITEMS:",
              history.length
            );

            /*
            ================================================
            CONSULTAR BRAIN
            ================================================
            */

            const profileName =
              matchingContact?.profile?.name;

            const contactReply =
              phone
                ? await registerWhatsAppContact({
                    phone,
                    text,
                    messageId:
                      whatsappMessageId,
                    profileName,
                    history,
                  })
                : null;
            // Archivos y notas de voz se registran para el equipo; no se finge
            // que Brain pudo verlos ni se envía una respuesta generada sin texto.
            if (!isConversationalText) continue;
            const brainReply = contactReply ?? await askBrain(request, history);

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
              recipient,
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
                ${storedIdentity},
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
