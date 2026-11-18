import { neon } from "@neondatabase/serverless";
import { reconcileQaProviderStatus } from "./whatsapp-status-qa";

// Isolated QA only: concurrent claims are atomic and capped at three total tries.
// 'unknown' cannot be claimed; a prior network timeout might have sent the message.
export async function recoverFailedQaReply(
  sql: ReturnType<typeof neon>,
  inboundMessageId: string,
  deliver: (replyText: string, attempt: number) => Promise<string>
): Promise<{ status: "recovered" | "not_eligible" | "unknown"; attempts?: number }> {
  if (!inboundMessageId.startsWith("qa-e2e-")) {
    return { status: "not_eligible" };
  }
  const claimed = (await sql`
    UPDATE public.whatsapp_delivery_qa
    SET state = 'processing',
        attempts = attempts + 1,
        lease_until = now() + interval '5 minutes',
        next_retry_at = NULL,
        updated_at = now()
    WHERE inbound_message_id = ${inboundMessageId}
      AND state = 'failed'
      AND attempts < 3
      AND reply_text IS NOT NULL
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    RETURNING reply_text, attempts
  `) as Array<{ reply_text: string; attempts: number }>;
  if (claimed.length !== 1 || typeof claimed[0]?.reply_text !== "string") {
    return { status: "not_eligible" };
  }
  const attempts = Number(claimed[0].attempts);
  try {
    const outboundId = await deliver(claimed[0].reply_text as string, attempts);
    await sql`
      UPDATE public.whatsapp_delivery_qa
      SET state = 'sent', outbound_message_id = ${outboundId},
          last_error_code = NULL, last_error_details = NULL,
          lease_until = NULL, updated_at = now()
      WHERE inbound_message_id = ${inboundMessageId} AND state = 'processing'
    `;
    await reconcileQaProviderStatus(sql,outboundId);
    return { status: "recovered", attempts };
  } catch {
    // A timeout may follow provider acceptance; never blindly repeat.
    await sql`
      UPDATE public.whatsapp_delivery_qa
      SET state = 'unknown', lease_until = NULL,
          last_error_code = 'QA_RECOVERY_RESULT_UNKNOWN',
          updated_at = now()
      WHERE inbound_message_id = ${inboundMessageId} AND state = 'processing'
    `;
    return { status: "unknown", attempts };
  }
}


/**
 * An expired lease is NOT a safe reason to send again: the provider may
 * have accepted the message before the application lost the response.
 * Quarantine expired QA processing attempts for human/provider reconciliation.
 */
export async function quarantineStaleQaLeases(sql: ReturnType<typeof neon>) {
  const expired = (await sql`
    UPDATE public.whatsapp_delivery_qa
    SET state='unknown',
        last_error_code='EXPIRED_PROCESSING_LEASE',
        lease_until=NULL,
        next_retry_at=NULL,
        updated_at=now()
    WHERE inbound_message_id LIKE 'qa-e2e-worker-%'
      AND state='processing'
      AND lease_until IS NOT NULL AND lease_until < now()
    RETURNING inbound_message_id
  `) as Array<{ inbound_message_id: string }>;
  return expired.length;
}
