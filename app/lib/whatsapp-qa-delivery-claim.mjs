export async function claimAutomaticQaReply(sql, { messageHash, challengeHash, recipientHash, receivedAt }) {
  const [claimed] = await sql`
    WITH authorized AS (
      UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply AS grant_row
      SET claimed_message_hash = message.message_hash
      FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_processing AS message
      WHERE message.message_hash = ${messageHash} AND message.state = 'completed'
        AND length(message.reply) BETWEEN 1 AND 4000
        AND grant_row.challenge_hash = ${challengeHash} AND grant_row.recipient_hash = ${recipientHash}
        AND grant_row.claimed_message_hash IS NULL AND grant_row.expires_at > now()
        AND ${receivedAt}::timestamptz BETWEEN grant_row.issued_at AND now() + interval '1 minute'
        AND ${receivedAt}::timestamptz > now() - interval '23 hours'
      RETURNING message.message_hash, message.reply, grant_row.challenge_hash,
        grant_row.recipient_hash, grant_row.expires_at
    ), delivery AS (
      INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery
        (message_hash, authorization_hash, recipient_hash, expires_at, attempted_at)
      SELECT message_hash, challenge_hash, recipient_hash, expires_at, now() FROM authorized
      ON CONFLICT DO NOTHING
      RETURNING message_hash
    )
    SELECT authorized.message_hash, authorized.reply FROM authorized JOIN delivery USING (message_hash)
  `;
  return claimed;
}
