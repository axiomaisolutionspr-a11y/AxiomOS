import { createHash } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { claimAutomaticQaReply } from "../../lib/whatsapp-qa-delivery-claim.mjs";

const PHONE_ID = "1489013234286695";
const WABA_ID = "1462452756074965";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
type DeliveryClaim = { message_hash: string; reply: string };

function configuredForQa(database: URL): boolean {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/axiomos-whatsapp-meta-qa-20261110" &&
    database.hostname === "ep-polished-fire-avorljs7-pooler.c-11.us-east-1.aws.neon.tech" &&
    database.username === "axiomos_wa_qa_ingress" &&
    process.env.META_WA_QA_WABA_ID === WABA_ID &&
    process.env.META_WA_QA_PHONE_ID === PHONE_ID;
}

export async function sendAuthorizedQaReply(request: Request, database: URL) {
  const authorization = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!authorization) return Response.json({ ok: false }, { status: 401 });

  const accessToken = process.env.META_WA_QA_ACCESS_TOKEN;
  const recipient = process.env.META_WA_QA_ALLOWED_SENDER;
  if (!accessToken || !recipient || !/^\d{8,20}$/.test(recipient) || !configuredForQa(database)) {
    return Response.json({ ok: false, error: "QA delivery unavailable" }, { status: 503 });
  }

  const sql = neon(database.href);
  // Consume approval before contacting Meta, including when the outcome is uncertain.
  const [claimed] = await sql`
    UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery AS delivery
    SET attempted_at = now()
    FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_processing AS message
    WHERE delivery.message_hash = message.message_hash
      AND delivery.authorization_hash = ${hash(authorization)}
      AND delivery.recipient_hash = ${hash(recipient)}
      AND delivery.attempted_at IS NULL AND delivery.expires_at > now()
      AND message.state = 'completed' AND message.created_at > now() - interval '23 hours'
      AND length(message.reply) BETWEEN 1 AND 4000
    RETURNING delivery.message_hash, message.reply
  `;
  if (!claimed) return Response.json({ ok: false }, { status: 409 });

  return sendClaimedReply(sql, accessToken, recipient, claimed as DeliveryClaim);
}

export async function sendAutomaticQaReply(
  sql: NeonQueryFunction<false, false>, database: URL,
  message: { text: string; timestamp?: number }, messageHash: string,
) {
  const accessToken = process.env.META_WA_QA_ACCESS_TOKEN;
  const recipient = process.env.META_WA_QA_ALLOWED_SENDER;
  if (!accessToken || !recipient || !configuredForQa(database) ||
      !message.timestamp || !/^Prueba Axira QA [a-f0-9]{8}$/.test(message.text)) return;

  const claimed = await claimAutomaticQaReply(sql, {
    messageHash, challengeHash: hash(message.text), recipientHash: hash(recipient),
    receivedAt: new Date(message.timestamp * 1000).toISOString(),
  });
  if (claimed) await sendClaimedReply(sql, accessToken, recipient, claimed);
}

async function sendClaimedReply(
  sql: NeonQueryFunction<false, false>, accessToken: string, recipient: string, claimed: DeliveryClaim,
) {

  const response = await fetch(`https://graph.facebook.com/v27.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body: claimed.reply },
    }),
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
  }).catch(() => null);
  const result = await response?.json().catch(() => null) as {
    messages?: Array<{ id?: string }>;
    error?: { code?: number };
  } | null | undefined;
  const providerId = result?.messages?.[0]?.id;
  if (!response?.ok || typeof providerId !== "string" || !providerId.startsWith("wamid.")) {
    const errorCode = Number.isSafeInteger(result?.error?.code) ? result?.error?.code : null;
    if (errorCode) await sql`
      UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery SET provider_error_code = ${errorCode}
      WHERE message_hash = ${claimed.message_hash}
    `;
    return Response.json({ ok: false, error: "Meta did not confirm acceptance", code: errorCode }, { status: 502 });
  }

  await sql`
    UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery
    SET accepted_at = now(), provider_message_hash = ${hash(providerId)}
    WHERE message_hash = ${claimed.message_hash}
  `;
  return Response.json({ ok: true, accepted: true });
}

export async function recordQaDeliveryStatus(
  sql: NeonQueryFunction<false, false>, database: URL, wabaId: string | null,
  phoneId: string | null, value: Record<string, unknown> | null,
) {
  const recipient = process.env.META_WA_QA_ALLOWED_SENDER;
  if (!process.env.META_WA_QA_ACCESS_TOKEN || !configuredForQa(database) ||
      !recipient || wabaId !== WABA_ID || phoneId !== PHONE_ID || !Array.isArray(value?.statuses)) return;

  for (const status of value.statuses) {
    if (status?.recipient_id !== recipient || typeof status.id !== "string" ||
        (status.status !== "delivered" && status.status !== "read" && status.status !== "failed")) continue;

    await sql`
      UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery
      SET delivered_at = CASE WHEN ${status.status} IN ('delivered', 'read')
            THEN COALESCE(delivered_at, now()) ELSE delivered_at END,
          failed_at = CASE WHEN ${status.status} = 'failed'
            THEN COALESCE(failed_at, now()) ELSE failed_at END
      WHERE provider_message_hash = ${hash(status.id)}
    `;
  }
}
