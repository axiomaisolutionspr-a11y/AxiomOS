import { createHmac, timingSafeEqual } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const META_WEBHOOK_VERIFY_TOKEN =
  process.env.META_WEBHOOK_VERIFY_TOKEN;

const META_APP_SECRET =
  process.env.META_APP_SECRET;

const META_GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION || "v25.0";

const META_GRAPH_API_BASE_URL =
  process.env.META_GRAPH_API_BASE_URL ||
  "https://graph.facebook.com";

const META_INSTAGRAM_GRAPH_API_BASE_URL =
  process.env.META_INSTAGRAM_GRAPH_API_BASE_URL ||
  META_GRAPH_API_BASE_URL;

const DEDUPLICATION_WINDOW_MS = 10 * 60 * 1000;
const MAX_SOCIAL_MESSAGE_LENGTH = 1200;
const BRAIN_REQUEST_TIMEOUT_MS = 21000;

type SocialChannel = "messenger" | "instagram";

type IncomingSocialMessage = {
  channel: SocialChannel;
  senderId: string;
  messageId: string;
  text: string;
};

type MetaChannelConfiguration = {
  accessToken: string;
  endpoint: string;
};

const processedMessageIds = new Map<string, number>();

function getRecord(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function getText(
  value: unknown,
  maxLength = MAX_SOCIAL_MESSAGE_LENGTH
): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function labelForChannel(channel: SocialChannel): string {
  return channel === "instagram"
    ? "Instagram"
    : "Facebook Messenger";
}

function matchesMetaSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!META_APP_SECRET || !signature) {
    return false;
  }

  const expected = `sha256=${createHmac(
    "sha256",
    META_APP_SECRET
  )
    .update(rawBody)
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function getIncomingMessages(
  payload: Record<string, unknown>
): IncomingSocialMessage[] {
  const channel: SocialChannel | null =
    payload.object === "page"
      ? "messenger"
      : payload.object === "instagram"
        ? "instagram"
        : null;

  if (!channel || !Array.isArray(payload.entry)) {
    return [];
  }

  const messages: IncomingSocialMessage[] = [];

  for (const rawEntry of payload.entry) {
    const entry = getRecord(rawEntry);

    if (!entry || !Array.isArray(entry.messaging)) {
      continue;
    }

    for (const rawEvent of entry.messaging) {
      const event = getRecord(rawEvent);
      const sender = getRecord(event?.sender);
      const message = getRecord(event?.message);

      if (!event || !sender || !message) {
        continue;
      }

      if (message.is_echo === true) {
        continue;
      }

      const senderId = getText(sender.id, 180);
      const text = getText(message.text);

      if (!senderId || !text) {
        continue;
      }

      const messageId =
        getText(message.mid, 260) ||
        getText(message.id, 260) ||
        `${channel}:${senderId}:${getText(
          event.timestamp,
          80
        )}`;

      messages.push({
        channel,
        senderId,
        messageId,
        text,
      });
    }
  }

  return messages;
}

function wasProcessedRecently(messageId: string): boolean {
  const now = Date.now();

  for (const [id, processedAt] of processedMessageIds) {
    if (now - processedAt > DEDUPLICATION_WINDOW_MS) {
      processedMessageIds.delete(id);
    }
  }

  return processedMessageIds.has(messageId);
}

function markAsProcessed(messageId: string) {
  processedMessageIds.set(messageId, Date.now());
}

function getChannelConfiguration(
  channel: SocialChannel
): MetaChannelConfiguration {
  const isInstagram = channel === "instagram";
  const accountId = isInstagram
    ? process.env.META_INSTAGRAM_ACCOUNT_ID?.trim()
    : process.env.META_PAGE_ID?.trim();

  const accessToken = isInstagram
    ? (
        process.env.META_INSTAGRAM_ACCESS_TOKEN ||
        process.env.META_PAGE_ACCESS_TOKEN
      )?.trim()
    : process.env.META_PAGE_ACCESS_TOKEN?.trim();

  const explicitEndpoint = isInstagram
    ? process.env.META_INSTAGRAM_SEND_URL?.trim()
    : process.env.META_MESSENGER_SEND_URL?.trim();

  if (!accountId && !explicitEndpoint) {
    throw new Error(
      isInstagram
        ? "META_INSTAGRAM_ACCOUNT_ID no está configurado."
        : "META_PAGE_ID no está configurado."
    );
  }

  if (!accessToken) {
    throw new Error(
      isInstagram
        ? "META_INSTAGRAM_ACCESS_TOKEN o META_PAGE_ACCESS_TOKEN no está configurado."
        : "META_PAGE_ACCESS_TOKEN no está configurado."
    );
  }

  const baseUrl = (
    isInstagram
      ? META_INSTAGRAM_GRAPH_API_BASE_URL
      : META_GRAPH_API_BASE_URL
  ).replace(/\/+$/, "");

  return {
    accessToken,
    endpoint:
      explicitEndpoint ||
      `${baseUrl}/${META_GRAPH_API_VERSION}/${encodeURIComponent(
        accountId || ""
      )}/messages`,
  };
}

async function sendMetaText(
  channel: SocialChannel,
  recipientId: string,
  text: string
) {
  const configuration = getChannelConfiguration(channel);

  const body =
    channel === "messenger"
      ? {
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: { text },
        }
      : {
          recipient: { id: recipientId },
          message: { text },
        };

  const response = await fetch(configuration.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuration.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Meta rechazó la respuesta de ${labelForChannel(
        channel
      )} (${response.status}).`
    );
  }
}

function getBrainUrl(requestOrigin: string): string {
  const configuredOrigin =
    process.env.AXIOMOS_APP_URL?.trim();

  try {
    return new URL(
      "/api/brain",
      configuredOrigin || requestOrigin
    ).toString();
  } catch {
    return new URL("/api/brain", requestOrigin).toString();
  }
}

function fallbackReply(): string {
  return (
    "¡Hola! Gracias por escribir a AxiomAI Solutions. " +
    "Brain recibió tu mensaje. Cuéntame qué tipo de negocio tienes y qué proceso te gustaría mejorar."
  );
}

async function getBrainReply(
  requestOrigin: string,
  message: IncomingSocialMessage
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    BRAIN_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(getBrainUrl(requestOrigin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        message: message.text,
        mode: "social",
        channel: message.channel,
      }),
    });

    const data = (await response.json()) as {
      result?: unknown;
    };

    const reply = getText(data?.result, 700);

    if (response.ok && reply) {
      return reply;
    }

    console.error("META_BRAIN_REPLY_FAILED", {
      channel: message.channel,
      messageId: message.messageId,
      status: response.status,
    });
  } catch (error) {
    console.error("META_BRAIN_REPLY_ERROR", {
      channel: message.channel,
      messageId: message.messageId,
      error:
        error instanceof Error ? error.name : "UnknownError",
    });
  } finally {
    clearTimeout(timeout);
  }

  return fallbackReply();
}

async function registerSocialProspect(
  message: IncomingSocialMessage,
  reply: string
) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return;
  }

  const source = labelForChannel(message.channel);
  const prospectKey = `social:${message.channel}:${message.senderId}`;
  const notes = [
    "SOCIAL / AXIOMOS BRAIN — MENSAJE ENTRANTE",
    `Canal: ${source}`,
    `ID del mensaje: ${message.messageId}`,
    `ID social: ${message.senderId}`,
    "",
    "Mensaje del prospecto:",
    message.text,
    "",
    "Respuesta de Brain:",
    reply,
  ]
    .join("\n")
    .slice(0, 6000);

  const sql = neon(databaseUrl);

  await sql`
    INSERT INTO prospects (
      prospect_key,
      caller_name,
      caller_phone,
      caller_company,
      crm_stage,
      assigned_to,
      crm_notes,
      first_seen_at,
      last_seen_at,
      created_at,
      updated_at
    )
    VALUES (
      ${prospectKey},
      ${`Prospecto de ${source}`},
      ${null},
      ${null},
      ${"Nuevo"},
      ${"Rolando"},
      ${notes},
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (prospect_key)
    DO UPDATE SET
      crm_notes =
        CASE
          WHEN prospects.crm_notes IS NULL
            OR BTRIM(prospects.crm_notes) = ''
          THEN EXCLUDED.crm_notes
          ELSE prospects.crm_notes
            || E'\n\n'
            || EXCLUDED.crm_notes
        END,
      last_seen_at = NOW(),
      updated_at = NOW()
  `;
}

async function processIncomingMessage(
  requestOrigin: string,
  message: IncomingSocialMessage
) {
  if (wasProcessedRecently(message.messageId)) {
    return;
  }

  const reply = await getBrainReply(requestOrigin, message);

  await sendMetaText(
    message.channel,
    message.senderId,
    reply
  );

  try {
    await registerSocialProspect(message, reply);
  } catch (error) {
    console.error("META_CRM_RECORD_FAILED", {
      channel: message.channel,
      messageId: message.messageId,
      error:
        error instanceof Error ? error.name : "UnknownError",
    });
  }

  markAsProcessed(message.messageId);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get(
    "hub.verify_token"
  );
  const challenge = request.nextUrl.searchParams.get(
    "hub.challenge"
  );

  if (!META_WEBHOOK_VERIFY_TOKEN) {
    console.error(
      "META_WEBHOOK_VERIFY_TOKEN no está configurado."
    );

    return NextResponse.json(
      { ok: false, error: "Webhook no configurado." },
      { status: 503 }
    );
  }

  if (
    mode === "subscribe" &&
    token === META_WEBHOOK_VERIFY_TOKEN &&
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

export async function POST(request: NextRequest) {
  if (!META_APP_SECRET) {
    console.error("META_APP_SECRET no está configurado.");

    return NextResponse.json(
      { ok: false, error: "Webhook no configurado." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get(
    "x-hub-signature-256"
  );

  if (!matchesMetaSignature(rawBody, signature)) {
    console.error("META_WEBHOOK_SIGNATURE_REJECTED");

    return NextResponse.json(
      { ok: false, error: "Firma no válida." },
      { status: 401 }
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = getRecord(JSON.parse(rawBody)) || {};
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON no válido." },
      { status: 400 }
    );
  }

  const incomingMessages = getIncomingMessages(payload);
  const requestOrigin = new URL(request.url).origin;

  after(async () => {
    const results = await Promise.allSettled(
      incomingMessages.map((message) =>
        processIncomingMessage(requestOrigin, message)
      )
    );

    const failures = results.filter(
      (result) => result.status === "rejected"
    );

    if (failures.length > 0) {
      console.error("META_WEBHOOK_PROCESSING_FAILED", {
        failures: failures.length,
      });
    }
  });

  return NextResponse.json(
    {
      ok: true,
      received: incomingMessages.length,
    },
    { status: 200 }
  );
}
