-- QA-ONLY migration for a dedicated ingress role created independently in Neon QA.
-- Applies only to the QA database. No role password, tokens, outbound messaging,
-- webhook configuration changes, or access to prospect tables.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='axiomos_qa_telnyx_ingress') THEN
   RAISE EXCEPTION 'Dedicated QA ingress role missing';
 END IF;
END $$;
GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_qa_telnyx_ingress;
CREATE OR REPLACE FUNCTION axiomos_commercial.qa_reconcile_telnyx_signed_probe(
 p_provider_message_id text,p_event_key text,p_event_type text,p_status text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE probe bigint;
BEGIN
 IF session_user NOT IN ('neondb_owner','postgres','axiomos_qa_telnyx_ingress') THEN
   RAISE EXCEPTION 'Restricted QA reconciliation' USING ERRCODE='42501';
 END IF;
 IF p_provider_message_id !~ '^[A-Za-z0-9-]{8,100}$' OR
    p_event_key !~ '^[A-Za-z0-9-]{8,100}$' OR
    p_event_type NOT IN ('message.sent','message.finalized') OR
    p_status NOT IN ('sent','delivered','delivery_failed','sending_failed','delivery_unconfirmed') OR
    (p_event_type='message.sent' AND p_status<>'sent') OR
    (p_event_type='message.finalized' AND p_status='sent')
 THEN RETURN 'INVALID_EVENT'; END IF;
 SELECT id INTO probe FROM axiomos_commercial.qa_telnyx_signed_probe
 WHERE tenant_id='axiomai' AND state='accepted' AND attempts=1
   AND provider_message_id=p_provider_message_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'UNKNOWN_OR_UNACCEPTED_PROBE'; END IF;
 INSERT INTO axiomos_commercial.qa_telnyx_probe_verified_events
 (probe_id,provider_message_id,event_key,event_type,delivery_status,evidence_source)
 VALUES (probe,p_provider_message_id,p_event_key,p_event_type,p_status,'ed25519_verified_qa_receiver')
 ON CONFLICT(probe_id,event_key) DO NOTHING;
 IF NOT FOUND THEN RETURN 'DUPLICATE_EVENT'; END IF;
 RETURN 'VERIFIED_EVENT_RECORDED';
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)
 TO axiomos_qa_telnyx_ingress;
COMMIT;
