import { createHash, randomUUID } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;
export type WhatsAppDeliveryLease = {
  messageId: string; conversationKey: string; token: string; replyText: string | null;
};

export async function claimWhatsAppDelivery(sql: Sql, input: {
  messageId: string; conversationKey: string; text: string;
}): Promise<WhatsAppDeliveryLease | null> {
  const token = randomUUID();
  const hash = createHash("sha256").update(JSON.stringify([input.conversationKey, input.text])).digest("hex");
  // Never replay legacy messages that predate this ledger. Expired work can
  // only be reclaimed BEFORE send starts. Sending/uncertain never auto-retry.
  const rows = await sql`
    INSERT INTO axira_whatsapp_delivery
      (message_id, conversation_key, payload_hash, owner_token, state)
    SELECT ${input.messageId}, ${input.conversationKey}, ${hash}, ${token}, 'processing'
    WHERE NOT EXISTS (SELECT 1 FROM whatsapp_messages WHERE whatsapp_message_id = ${input.messageId})
    ON CONFLICT (message_id) DO NOTHING
    RETURNING reply_text
  `;
  // Recover only work recorded by this ledger; never replay legacy messages.
  const recovered = rows.length ? rows : await sql`
    UPDATE axira_whatsapp_delivery SET owner_token = ${token}, state = 'processing',
      attempts = attempts + 1, updated_at = NOW()
    WHERE message_id = ${input.messageId} AND conversation_key = ${input.conversationKey}
      AND payload_hash = ${hash}
      AND (state = 'retryable' OR (state = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes'))
    RETURNING reply_text
  `;
  if (recovered.length) return { ...input, token,
    replyText: typeof recovered[0].reply_text === "string" ? recovered[0].reply_text : null };
  const existing = await sql`SELECT conversation_key, payload_hash FROM axira_whatsapp_delivery
    WHERE message_id = ${input.messageId}`;
  if (existing.length && (existing[0].conversation_key !== input.conversationKey || existing[0].payload_hash !== hash)) {
    throw new Error("WHATSAPP_DUPLICATE_PAYLOAD_MISMATCH");
  }
  return null;
}

export async function beginWhatsAppSend(sql: Sql, lease: WhatsAppDeliveryLease, reply: string) {
  const rows = await sql`UPDATE axira_whatsapp_delivery
    SET state = 'sending', reply_text = ${reply}, updated_at = NOW()
    WHERE message_id = ${lease.messageId} AND owner_token = ${lease.token} AND state = 'processing'
    RETURNING message_id`;
  if (!rows.length) throw new Error("WHATSAPP_DELIVERY_LEASE_LOST");
}

export async function repairSentWhatsAppHistory(sql: Sql, messageId: string, phone: string) {
  const replyId = `axiomos:reply:${createHash("sha256").update(messageId).digest("hex")}`;
  await sql`INSERT INTO whatsapp_messages (conversation_key, phone, role, message, whatsapp_message_id)
    SELECT conversation_key, ${phone}, 'assistant', reply_text, ${replyId}
    FROM axira_whatsapp_delivery WHERE message_id = ${messageId} AND state = 'sent' AND reply_text IS NOT NULL
    ON CONFLICT (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL DO NOTHING`;
}

export async function completeWhatsAppSend(sql: Sql, lease: WhatsAppDeliveryLease, phone: string) {
  const rows = await sql`UPDATE axira_whatsapp_delivery SET state = 'sent', updated_at = NOW()
    WHERE message_id = ${lease.messageId} AND owner_token = ${lease.token} AND state = 'sending'
    RETURNING message_id`;
  if (!rows.length) throw new Error("WHATSAPP_DELIVERY_COMPLETION_FAILED");
  await repairSentWhatsAppHistory(sql, lease.messageId, phone);
}

export async function failWhatsAppDelivery(sql: Sql, lease: WhatsAppDeliveryLease, sendStarted: boolean) {
  await sql`UPDATE axira_whatsapp_delivery SET state = ${sendStarted ? "uncertain" : "retryable"}, updated_at = NOW()
    WHERE message_id = ${lease.messageId} AND owner_token = ${lease.token} AND state IN ('processing', 'sending')`;
}

export async function ignoreWhatsAppDelivery(sql: Sql, lease: WhatsAppDeliveryLease) {
  await sql`UPDATE axira_whatsapp_delivery SET state = 'ignored', updated_at = NOW()
    WHERE message_id = ${lease.messageId} AND owner_token = ${lease.token} AND state = 'processing'`;
}
