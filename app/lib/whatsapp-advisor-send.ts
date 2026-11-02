import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;
type Input = {
  requestId: string;
  conversationKey: string;
  recipient: string;
  recipientKind: "phone" | "bsuid";
  text: string;
  advisor: string;
  inboundAt: Date;
};

// The caller must supply a verified provider timestamp, not the time at which
// the webhook happened to be written to the database.
export async function sendAdvisorMessage(
  sql: Sql,
  input: Input,
  send: (input: Input) => Promise<{ providerId: string }>
) {
  const now = Date.now();
  const inboundMs = input.inboundAt.getTime();
  if (!Number.isFinite(inboundMs) || inboundMs > now ||
      now - inboundMs >= 24 * 60 * 60 * 1000) {
    return { state: "window_closed" as const };
  }
  if (!input.requestId || !input.text.trim() || input.text.length > 4000 ||
      !input.recipient || !input.conversationKey || !input.advisor) {
    return { state: "invalid" as const };
  }
  const rows = await sql`
    INSERT INTO axira_advisor_outbound
      (request_id, conversation_key, recipient, recipient_kind, body, advisor, state)
    VALUES (${input.requestId}, ${input.conversationKey}, ${input.recipient},
      ${input.recipientKind}, ${input.text}, ${input.advisor}, 'sending')
    ON CONFLICT (request_id) DO NOTHING RETURNING request_id
  `;
  if (!rows.length) return { state: "already_processed" as const };

  let providerId: string;
  try {
    const response = await send(input);
    if (!response.providerId) throw new Error("Provider did not return a message ID");
    providerId = response.providerId;
  } catch {
    await sql`UPDATE axira_advisor_outbound SET state='uncertain', updated_at=NOW()
      WHERE request_id=${input.requestId} AND state='sending'`;
    return { state: "uncertain" as const };
  }
  const updated = await sql`UPDATE axira_advisor_outbound
    SET state='accepted', provider_id=${providerId}, updated_at=NOW()
    WHERE request_id=${input.requestId} AND state='sending' RETURNING request_id`;
  if (!updated.length) throw new Error("ADVISOR_ACCEPTANCE_RECORD_FAILED");
  await sql`INSERT INTO whatsapp_messages (conversation_key, phone, role, message, whatsapp_message_id)
    VALUES (${input.conversationKey}, ${input.recipient}, 'assistant', ${input.text}, ${providerId})
    ON CONFLICT (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL DO NOTHING`;
  return { state: "accepted" as const };
}
