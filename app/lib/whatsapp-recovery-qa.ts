import { neon } from "@neondatabase/serverless";

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
  const claimed = await sql`
    UPDATE public.whatsapp_delivery_qa
    SET state = 'processing',
        attempts = attempts + 1,
        lease_until = now() + interval '5 minutes',
        updated_at = now()
    WHERE inbound_message_id = ${inboundMessageId}
      AND state = 'failed'
      AND attempts < 3
      AND reply_text IS NOT NULL
    RETURNING reply_text, attempts
  `;
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
