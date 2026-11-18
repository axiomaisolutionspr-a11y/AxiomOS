import {
  NextRequest,
  NextResponse,
} from "next/server";

import { neon } from "@neondatabase/serverless";
import { registerWhatsAppContact } from "../../lib/whatsapp-contact-request";
import {assessMetaWebhookSignature} from "../../lib/meta-signature-policy";
import { recoverFailedQaReply } from "../../lib/whatsapp-recovery-qa";
import { recordQaProviderStatus, reconcileQaProviderStatus } from "../../lib/whatsapp-status-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

const DUALHOOK_API_KEY =
  process.env.DUALHOOK_API_KEY;

const WHATSAPP_MAX_TEXT_LENGTH = 4000;

// Never enable simulation on production, other preview branches, or a different DB.
// Synthetic events are signed with a separate QA secret.
function isIsolatedWhatsAppQa(): boolean {
  const env = process.env;
  if (
    env.VERCEL_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== "audit/whatsapp-inbound-outbound-20261116" ||
    env.AXIOMOS_WHATSAPP_DELIVERY_QA_ENABLED !== "true" ||
    env.AXIOMOS_WHATSAPP_DELIVERY_QA_ISOLATED !== "true" ||
    env.AXIOMOS_WHATSAPP_E2E_SIMULATE !== "true" ||
    !env.AXIOMOS_WHATSAPP_QA_TEST_SECRET ||
    !env.AXIOMOS_WHATSAPP_QA_DB_HOST
  ) return false;
  try {
    const host = new URL(env.DATABASE_URL || "").hostname.replace("-pooler.", ".");
    return host === env.AXIOMOS_WHATSAPP_QA_DB_HOST;
  } catch {
    return false;
  }
}

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
  text: string,
  qaCorrelationId?: string
) {
  if (isIsolatedWhatsAppQa()) {
    if (recipient.kind !== "bsuid" || !recipient.value.startsWith("qa-e2e-")) {
      throw new Error("QA simulation blocks non-synthetic WhatsApp recipients");
    }
    console.log("WHATSAPP_QA_PROVIDER_ACCEPTED_SIMULATION");
    return JSON.stringify({ messages: [{ id: `qa-provider-ack-${qaCorrelationId || "qa-e2e-unlinked"}` }] });
  }
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

  // Provider body may contain identifiers and customer-specific details.
  console.log("DUALHOOK_OUTBOUND_RESPONSE_METADATA:", {
    httpStatus: response.status,
    responseBytes: Buffer.byteLength(responseBody, "utf8")
  });

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
  text: string,
  qaCorrelationId?: string
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
        chunks[index],
        qaCorrelationId
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
  messages: BrainMessage[],
  businessContext = ""
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
        businessContext,
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
    const qaMode = isIsolatedWhatsAppQa();
    // Fail closed if simulation was configured but QA isolation is not provable.
    if (process.env.AXIOMOS_WHATSAPP_E2E_SIMULATE === "true" && !qaMode) {
      return NextResponse.json({ ok: false, error: "QA isolation failed" }, { status: 503 });
    }
    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not configured"
      );
    }

    const sql = neon(databaseUrl);

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody,"utf8") > 3*1024*1024) {
      return NextResponse.json({error:"Payload too large"},{status:413});
    }
    const signatureAssessment = assessMetaWebhookSignature(
      rawBody,request.headers.get("x-hub-signature-256"),
      qaMode ? process.env.AXIOMOS_WHATSAPP_QA_TEST_SECRET : process.env.META_APP_SECRET
    );
    // Safe rollout: observation only until signed production events are confirmed.
    // If the provider strips Meta's signature, fail-closed would disrupt Axira.
    if(!signatureAssessment.valid) {
      console.warn("WHATSAPP_SIGNATURE_SHADOW",{
        result:signatureAssessment.reason,
        enforcement:process.env.AXIOMOS_WHATSAPP_SIGNATURE_ENFORCE==="true"
      });
      if(qaMode || process.env.AXIOMOS_WHATSAPP_SIGNATURE_ENFORCE==="true") {
        return NextResponse.json({error:"Invalid webhook signature"},{status:401});
      }
    }
    const body = JSON.parse(rawBody);

    const entries =
      Array.isArray(body?.entry)
        ? body.entry
        : [];
    if (qaMode) {
      const changes = entries.flatMap((entry: any) => Array.isArray(entry?.changes) ? entry.changes : []);
      const messages = changes.flatMap((change: any) => Array.isArray(change?.value?.messages) ? change.value.messages : []);
      const statusesQa = changes.flatMap((change: any) => Array.isArray(change?.value?.statuses) ? change.value.statuses : []);
      const only = messages[0];
      const statusQa = statusesQa[0];
      const syntheticMessage = messages.length === 1 && statusesQa.length === 0 &&
        typeof only?.id === "string" && only.id.startsWith("qa-e2e-") &&
        typeof only?.from_user_id === "string" && only.from_user_id.startsWith("qa-e2e-") &&
        !only?.from && only?.type === "text" && typeof only?.text?.body === "string";
      const syntheticStatus = statusesQa.length === 1 && messages.length === 0 &&
        typeof statusQa?.id === "string" && statusQa.id.startsWith("qa-provider-ack-qa-e2e-") &&
        ["sent","delivered","read","failed"].includes(statusQa.status) &&
        (!statusQa.recipient_user_id || statusQa.recipient_user_id === "qa-e2e-recipient") &&
        !statusQa.recipient_id;
      const scopeOk = entries.length === 1 && entries[0]?.id === "qa-e2e-waba" &&
        changes.length === 1 && changes[0]?.field === "messages" &&
        changes[0]?.value?.metadata?.phone_number_id === "qa-e2e-phone";
      if (!scopeOk || !(syntheticMessage || syntheticStatus)) {
        return NextResponse.json({ ok: false, error: "Only synthetic QA events allowed" }, { status: 403 });
      }
    }

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
          if (qaMode) {
            const result = await recordQaProviderStatus(sql as ReturnType<typeof neon>,{
              outboundId: status.id,
              status: status.status,
              timestamp: Number(status.timestamp),
              errorCode: typeof status?.errors?.[0]?.code === "number" ?
                String(status.errors[0].code) : null,
            });
            console.log("WHATSAPP_QA_STATUS_RECORDED",{
              stored: result.stored, matched: result.matched, status: result.status
            });
          }
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
                errorCodes: statusErrors.map((item: { code?: unknown }) =>
                  typeof item?.code === "number" ? item.code : null),
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

          console.log("WHATSAPP_INCOMING_METADATA:", {
            recipientKind: recipient.kind,
            hasPhone: Boolean(phone),
            hasBsuid: Boolean(userId),
            textLength: text.length,
            hasMessageId: Boolean(whatsappMessageId)
          });

          try {
            /*
            ================================================
            EVITAR MENSAJES DUPLICADOS
            ================================================
            */

            // QA-only durable intake state. Disabled unless explicitly enabled in isolated QA.
            // Explicit opt-in and isolated QA database only. QA Vercel projects
            // may use VERCEL_ENV=production, so that variable is not sufficient.
            const deliveryQaEnabled =
              qaMode;
            if (deliveryQaEnabled && whatsappMessageId) {
              await sql`
                INSERT INTO public.whatsapp_delivery_qa
                  (inbound_message_id, conversation_key, state, inbound_text, recipient_kind, recipient_value)
                VALUES (${whatsappMessageId}, ${conversationKey}, 'received',
                  ${text}, ${recipient.kind}, ${recipient.value})
                ON CONFLICT (inbound_message_id) DO NOTHING
              `;
            }

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
                console.warn(
                  "WHATSAPP_DUPLICATE_REDELIVERY_UNVERIFIED:",
                  {
                    messageId: whatsappMessageId,
                    conversationKey,
                    reason: "Existing inbound row does not prove outbound delivery",
                    action: "Skipped automatically; requires delivery-state reconciliation",
                  }
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
                        LIMIT 24
                      `
                    : await sql`
                        SELECT role, message
                        FROM whatsapp_messages
                        WHERE conversation_key =
                          ${conversationKey}
                        ORDER BY created_at DESC, id DESC
                        LIMIT 24
                      `;

                const retryHistory =
                  buildBrainHistory(
                    retryRows as Array<{
                      role?: unknown;
                      message?: unknown;
                    }>
                  );

                if (
                  !qaMode &&
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

                if (deliveryQaEnabled && whatsappMessageId && recipient) {
                  const recovered = await recoverFailedQaReply(
                    sql as ReturnType<typeof neon>,
                    whatsappMessageId,
                    async (reply) => {
                      const result = await sendWhatsAppMessage(recipient, reply, whatsappMessageId);
                      const parsed = JSON.parse(result[0] || "{}") as { messages?: Array<{ id?: string }> };
                      const outboundId = parsed.messages?.[0]?.id;
                      if (!outboundId) throw new Error("QA provider acknowledgement missing message ID");
                      return outboundId;
                    }
                  );
                  if (recovered.status === "recovered") {
                    repliesSent += 1;
                    console.log("WHATSAPP_QA_RECOVERY_SENT", whatsappMessageId);
                  } else if (recovered.status === "unknown") {
                    console.error("WHATSAPP_QA_RECOVERY_UNCERTAIN", whatsappMessageId);
                  }
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
                    LIMIT 24
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
                    LIMIT 24
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
              !qaMode && phone
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
            // CRM: entregar contexto empresarial por un campo separado;
            // de otra forma, el recorte del historial elimina las notas.
            let businessContext = "";
            if (phone && !contactReply) {
              try {
                const prospectRows = await sql`
                  SELECT caller_company, crm_notes
                  FROM prospects
                  WHERE prospect_key = ${`phone:${phone.slice(-10)}`}
                  LIMIT 1
                `;
                const company = typeof prospectRows[0]?.caller_company === "string"
                  ? prospectRows[0].caller_company.trim().slice(0, 200)
                  : "";
                const rawNotes = typeof prospectRows[0]?.crm_notes === "string"
                  ? prospectRows[0].crm_notes.trim()
                  : "";
                // Las notas suelen incluir mensajes automáticos; retener el
                // comienzo y los eventos más recientes sin exceder el límite.
                const notes = rawNotes.length > 1700
                  ? rawNotes.slice(0, 1050) + "\n[...]\n" + rawNotes.slice(-500)
                  : rawNotes;
                businessContext = [
                  company ? `Negocio confirmado en CRM: ${company}.` : "",
                  notes ? `Notas comerciales del CRM (pueden contener información antigua):\n${notes}` : "",
                ].filter(Boolean).join("\n");
              } catch {
                console.error("WHATSAPP_CRM_CONTEXT_LOOKUP_FAILED");
              }
            }
            // Exercise the actual intake-before-Brain failure path in QA only.
            // Worker must recover from a durable snapshot, not from webhook replay.
            if (qaMode && text === "QA_TRIGGER_BRAIN_FAILURE" && whatsappMessageId) {
              await sql`
                UPDATE public.whatsapp_delivery_qa
                SET state='failed', intake_error='QA_BRAIN_UNAVAILABLE',
                    next_retry_at=now(),updated_at=now()
                WHERE inbound_message_id=${whatsappMessageId} AND state='received'
              `;
              throw new Error("QA simulated Brain failure after durable intake");
            }
            const brainReply = qaMode
              ? "AXIRA_QA_REPLY_SIMULATED"
              : contactReply ?? await askBrain(request, history, businessContext);

            console.log("WHATSAPP_BRAIN_REPLY_METADATA:", {
              replyLength: brainReply.length,
              simulated: qaMode
            });

            /*
            ================================================
            ENVIAR RESPUESTA POR WHATSAPP
            ================================================
            */

            if (deliveryQaEnabled && whatsappMessageId) {
              await sql`
                UPDATE public.whatsapp_delivery_qa
                SET reply_text=${brainReply},updated_at=now()
                WHERE inbound_message_id=${whatsappMessageId} AND state='received'
              `;
            }

            let qaFirstAttemptFailure: "503" | "timeout" | null = null;
            if (deliveryQaEnabled && whatsappMessageId) {
              const claimed = await sql`
                UPDATE public.whatsapp_delivery_qa
                SET state = 'processing', attempts = attempts + 1,
                    lease_until = now() + interval '5 minutes', updated_at = now()
                WHERE inbound_message_id = ${whatsappMessageId}
                  AND state = 'received'
                RETURNING inbound_message_id, attempts
              `;
              if (claimed.length !== 1) {
                console.warn("WHATSAPP_QA_DELIVERY_NOT_CLAIMED", whatsappMessageId);
                continue;
              }
              if (qaMode && Number(claimed[0].attempts) === 1) {
                qaFirstAttemptFailure = text === "QA_TRIGGER_503" ? "503" :
                  text === "QA_TRIGGER_TIMEOUT" ? "timeout" : null;
              }
            }

            let qaOutboundId: string | null = null;
            try {
              if (qaFirstAttemptFailure === "503") throw new Error("Dualhook error 503: QA simulated rejection");
              if (qaFirstAttemptFailure === "timeout") throw new Error("QA simulated network timeout (uncertain)");
              const sendResponses = await sendWhatsAppMessage(recipient, brainReply, whatsappMessageId ?? undefined);
              if (deliveryQaEnabled && whatsappMessageId) {
                const parsed = JSON.parse(sendResponses[0] || "{}") as { messages?: Array<{ id?: string }> };
                if (typeof parsed.messages?.[0]?.id !== "string") {
                  throw new Error("QA provider acknowledgement did not include a message ID");
                }
                qaOutboundId = parsed.messages[0].id;
              }
            } catch (sendError) {
              if (deliveryQaEnabled && whatsappMessageId) {
                // Retry only explicit provider rejections for a single-part message.
                // Network timeouts and multipart sends remain unknown to avoid duplicates.
                const sendErrorText = sendError instanceof Error ? sendError.message : '';
                const rejectedTransient =
                  /^Dualhook error (429|503)(?:\s|\/|:)/.test(sendErrorText) &&
                  splitWhatsAppMessage(brainReply).length === 1;
                if (rejectedTransient) {
                  await sql`
                    UPDATE public.whatsapp_delivery_qa
                    SET state='failed',last_error_code='TRANSIENT_REJECTED',
                        last_error_details=${sendErrorText.slice(0,500)},
                        next_retry_at=${qaMode ? new Date().toISOString() : new Date(Date.now()+60000).toISOString()},
                        updated_at=now()
                    WHERE inbound_message_id=${whatsappMessageId} AND state='processing'
                  `;
                } else {
                // A provider timeout can occur after accepting a message: do not blindly retry.
                await sql`
                  UPDATE public.whatsapp_delivery_qa
                  SET state = 'unknown',
                      lease_until = NULL, next_retry_at = NULL,
                      last_error_details = ${sendError instanceof Error ? sendError.message.slice(0, 500) : 'send failed'},
                      updated_at = now()
                  WHERE inbound_message_id = ${whatsappMessageId}
                    AND state = 'processing'
                `;
                }
              }
              throw sendError;
            }
            if (deliveryQaEnabled && whatsappMessageId) {
              await sql`
                UPDATE public.whatsapp_delivery_qa
                SET state = 'sent', outbound_message_id=${qaOutboundId},
                    next_retry_at=NULL, updated_at = now()
                WHERE inbound_message_id = ${whatsappMessageId}
                  AND state = 'processing'
              `;
              if (qaOutboundId) await reconcileQaProviderStatus(sql as ReturnType<typeof neon>,qaOutboundId);
            }

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
