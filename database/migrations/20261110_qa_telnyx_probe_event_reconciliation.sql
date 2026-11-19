-- QA-ONLY schema: signed-probe receipts are distinct from earlier QA one-shot SMS.
-- Do not deploy to production. The external receiver authenticates Ed25519 BEFORE
-- calling this persistence routine. No automated provider sends, keys or credentials.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE TABLE axiomos_commercial.qa_telnyx_probe_verified_events (
  probe_id bigint NOT NULL REFERENCES axiomos_commercial.qa_telnyx_signed_probe(id) ON DELETE RESTRICT,
  provider_message_id text NOT NULL CHECK (provider_message_id ~ '^[A-Za-z0-9-]{8,100}$'),
  event_key text NOT NULL CHECK (event_key ~ '^[A-Za-z0-9-]{8,100}$'),
  event_type text NOT NULL CHECK (event_type IN ('message.sent','message.finalized')),
  delivery_status text NOT NULL CHECK (delivery_status IN ('sent','delivered','delivery_failed','sending_failed','delivery_unconfirmed')),
  evidence_source text NOT NULL CHECK (evidence_source = 'ed25519_verified_qa_receiver'),
  observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (probe_id,event_key)
);
REVOKE ALL ON axiomos_commercial.qa_telnyx_probe_verified_events
  FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader;

CREATE FUNCTION axiomos_commercial.qa_reconcile_telnyx_signed_probe(
  p_provider_message_id text,p_event_key text,p_event_type text,p_status text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE probe bigint;
BEGIN
  -- A separate, explicit QA ingress identity must be provisioned/reviewed before use.
  -- No app roles or anonymous callers may invoke this function.
  IF session_user NOT IN ('neondb_owner','postgres') THEN
    RAISE EXCEPTION 'QA owner-only reconciliation' USING ERRCODE='42501';
  END IF;
  IF p_provider_message_id !~ '^[A-Za-z0-9-]{8,100}$' OR
     p_event_key !~ '^[A-Za-z0-9-]{8,100}$' OR
     p_event_type NOT IN ('message.sent','message.finalized') OR
     p_status NOT IN ('sent','delivered','delivery_failed','sending_failed','delivery_unconfirmed') OR
     (p_event_type='message.sent' AND p_status<>'sent') OR
     (p_event_type='message.finalized' AND p_status='sent') THEN
     RETURN 'INVALID_EVENT';
  END IF;
  SELECT id INTO probe
  FROM axiomos_commercial.qa_telnyx_signed_probe
  WHERE tenant_id='axiomai'
    AND state='accepted' AND attempts=1 AND provider_message_id=p_provider_message_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN 'UNKNOWN_OR_UNACCEPTED_PROBE'; END IF;
  INSERT INTO axiomos_commercial.qa_telnyx_probe_verified_events
   (probe_id,provider_message_id,event_key,event_type,delivery_status,evidence_source)
   VALUES (probe,p_provider_message_id,p_event_key,p_event_type,p_status,'ed25519_verified_qa_receiver')
  ON CONFLICT (probe_id,event_key) DO NOTHING;
  IF NOT FOUND THEN RETURN 'DUPLICATE_EVENT'; END IF;
  RETURN 'VERIFIED_EVENT_RECORDED';
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
COMMIT;
