// A unique index and one atomic upsert prevent concurrent webhook retries
// from creating more than one active processing claim for a message.
export async function claimQaMessage(sql, hash, attempt) {
  const rows = await sql`
    INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_processing (message_hash, state, attempt_id)
    VALUES (${hash}, 'processing', ${attempt})
    ON CONFLICT (message_hash) DO UPDATE SET state = 'processing', attempt_id = ${attempt}, updated_at = now()
    WHERE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing.state = 'failed'
       OR (axiomos_qa_ingress_scope.meta_whatsapp_qa_processing.state = 'processing'
           AND axiomos_qa_ingress_scope.meta_whatsapp_qa_processing.updated_at < now() - interval '2 minutes')
    RETURNING message_hash
  `;
  return rows.length === 1;
}
