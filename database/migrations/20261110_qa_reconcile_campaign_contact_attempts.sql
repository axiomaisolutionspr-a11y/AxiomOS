-- QA ONLY — conservative, idempotent import of accepted campaign attempts.
-- Does NOT label acceptance as delivery, certify complete history or send messages.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
ALTER TABLE axiomos_commercial.qa_contact_history
  DROP CONSTRAINT qa_contact_history_purpose_check;
ALTER TABLE axiomos_commercial.qa_contact_history
  ADD CONSTRAINT qa_contact_history_purpose_check
  CHECK (purpose IN ('followup','appointment_reminder','marketing'));
INSERT INTO axiomos_commercial.qa_contact_history
(tenant_id,prospect_id,channel,purpose,source_system,source_event_key,occurred_at,event_type)
SELECT 'axiomai',c.prospect_id,'whatsapp','marketing','reconciled_campaign',
       c.provider_message_id,c.sent_at,'accepted'
FROM public.whatsapp_campaign_sends c
JOIN public.prospects p ON p.id=c.prospect_id
WHERE c.status='accepted'
 AND c.sent_at IS NOT NULL AND c.sent_at <= clock_timestamp()
 AND c.provider_message_id IS NOT NULL
 AND length(c.provider_message_id) BETWEEN 8 AND 180
 AND c.provider_message_id ~ '^[A-Za-z0-9._=-]{8,180}$'
ON CONFLICT (tenant_id,source_system,source_event_key) DO NOTHING;
-- No write to qa_contact_history_coverage: historic completeness is NOT proven.
COMMIT;
