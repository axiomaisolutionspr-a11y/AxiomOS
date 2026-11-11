-- Apply only to the isolated Meta WhatsApp QA branch.
CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_qa_followup (
  outbox_id bigint PRIMARY KEY REFERENCES axiomos_commercial.qa_delivery_outbox(id),
  challenge_hash text UNIQUE NOT NULL CHECK (challenge_hash ~ '^[a-f0-9]{64}$'),
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[a-f0-9]{64}$'),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 512),
  issued_at timestamptz NOT NULL DEFAULT date_trunc('second', now()),
  expires_at timestamptz NOT NULL CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '1 hour'),
  inbound_hash text UNIQUE,
  provider_hash text UNIQUE,
  accepted_at timestamptz,
  provider_error_code integer
);

CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_qa_followup_status (
  provider_hash text PRIMARY KEY CHECK (provider_hash ~ '^[a-f0-9]{64}$'),
  delivered_at timestamptz,
  failed_at timestamptz
);

REVOKE ALL ON axiomos_qa_ingress_scope.meta_whatsapp_qa_followup,
  axiomos_qa_ingress_scope.meta_whatsapp_qa_followup_status FROM PUBLIC, axiomos_wa_qa_ingress;

CREATE OR REPLACE FUNCTION axiomos_qa_ingress_scope.claim_qa_whatsapp_followup(
  p_challenge text, p_recipient text, p_inbound text, p_received_at timestamptz
) RETURNS TABLE(outbox_id bigint, body text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  WITH candidate AS (
    SELECT q.id, g.body FROM axiomos_commercial.qa_delivery_outbox q
    JOIN axiomos_qa_ingress_scope.meta_whatsapp_qa_followup g ON g.outbox_id = q.id
    WHERE g.challenge_hash = p_challenge AND g.recipient_hash = p_recipient AND g.inbound_hash IS NULL
      AND p_inbound ~ '^[a-f0-9]{64}$'
      AND g.expires_at > now() AND p_received_at BETWEEN g.issued_at AND now() + interval '1 minute'
      AND (now() AT TIME ZONE 'America/Puerto_Rico')::time >= time '09:00'
      AND (now() AT TIME ZONE 'America/Puerto_Rico')::time < time '18:00'
      AND q.test_key LIKE 'QA-WA-FOLLOWUP-%' AND q.channel = 'whatsapp' AND q.tenant_id = 'axiomai'
      AND q.status = 'pending' AND q.attempts = 0 AND q.due_at <= now()
      AND q.is_synthetic AND q.authorized AND q.opt_in AND NOT q.suppressed
    FOR UPDATE OF q, g SKIP LOCKED
  ), claimed AS (
    UPDATE axiomos_commercial.qa_delivery_outbox q
    SET status = 'claimed', claim_at = now(), attempts = 1, audit_note = 'QA_META_FOLLOWUP_CLAIMED'
    FROM candidate c WHERE q.id = c.id RETURNING q.id, c.body
  )
  UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_followup g SET inbound_hash = p_inbound
  FROM claimed c WHERE g.outbox_id = c.id RETURNING c.id, c.body;
$$;

CREATE OR REPLACE FUNCTION axiomos_qa_ingress_scope.finish_qa_whatsapp_followup(
  p_outbox bigint, p_inbound text, p_outcome text, p_provider text, p_error integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('accepted', 'failed', 'uncertain')
     OR (p_outcome = 'accepted' AND (p_provider IS NULL OR p_provider !~ '^[a-f0-9]{64}$'))
     OR (p_outcome <> 'accepted' AND p_provider IS NOT NULL) THEN RETURN; END IF;

  UPDATE axiomos_commercial.qa_delivery_outbox q SET status = p_outcome,
    audit_note = CASE p_outcome WHEN 'accepted' THEN 'QA_META_ACCEPTED' WHEN 'failed' THEN 'QA_META_REJECTED' ELSE 'QA_META_UNCERTAIN' END
  FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_followup g
  WHERE q.id = p_outbox AND g.outbox_id = q.id AND g.inbound_hash = p_inbound AND q.status = 'claimed';
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_followup
  SET provider_hash = p_provider, accepted_at = CASE WHEN p_outcome = 'accepted' THEN now() END,
      provider_error_code = p_error WHERE outbox_id = p_outbox;
END;
$$;

CREATE OR REPLACE FUNCTION axiomos_qa_ingress_scope.record_qa_whatsapp_followup_status(
  p_provider text, p_recipient text, p_status text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_qa_followup_status AS receipt
    (provider_hash, delivered_at, failed_at)
  SELECT p_provider, CASE WHEN p_status IN ('delivered', 'read') THEN now() END,
         CASE WHEN p_status = 'failed' THEN now() END
  WHERE p_provider ~ '^[a-f0-9]{64}$' AND p_status IN ('delivered', 'read', 'failed')
    AND EXISTS (
      SELECT 1 FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_followup g
      JOIN axiomos_commercial.qa_delivery_outbox q ON q.id = g.outbox_id
      WHERE g.recipient_hash = p_recipient AND (g.provider_hash = p_provider
        OR (q.status IN ('claimed','uncertain') AND q.claim_at >= now() - interval '2 minutes'))
    )
  ON CONFLICT (provider_hash) DO UPDATE SET
    delivered_at = COALESCE(receipt.delivered_at, EXCLUDED.delivered_at),
    failed_at = COALESCE(receipt.failed_at, EXCLUDED.failed_at);
$$;

REVOKE ALL ON FUNCTION axiomos_qa_ingress_scope.claim_qa_whatsapp_followup(text,text,text,timestamptz),
  axiomos_qa_ingress_scope.finish_qa_whatsapp_followup(bigint,text,text,text,integer),
  axiomos_qa_ingress_scope.record_qa_whatsapp_followup_status(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_qa_ingress_scope.claim_qa_whatsapp_followup(text,text,text,timestamptz),
  axiomos_qa_ingress_scope.finish_qa_whatsapp_followup(bigint,text,text,text,integer),
  axiomos_qa_ingress_scope.record_qa_whatsapp_followup_status(text,text,text) TO axiomos_wa_qa_ingress;
