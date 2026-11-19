-- Neon QA branch ONLY; ingest must only follow verification of raw-body webhook signatures.
-- No provider calls, real customer rows, ALTER, DROP or secrets.
BEGIN;
CREATE TABLE axiomos_commercial.qa_provider_receipts (
 outbox_id bigint PRIMARY KEY REFERENCES axiomos_commercial.qa_delivery_outbox(id) ON DELETE RESTRICT,
 provider text NOT NULL CHECK(provider IN ('telnyx','dualhook')),
 provider_message_id text NOT NULL UNIQUE CHECK(provider_message_id ~ '^[a-zA-Z0-9._-]{8,150}$'),
 delivery_state text NOT NULL DEFAULT 'accepted'
   CHECK(delivery_state IN ('accepted','sent','delivered','read','failed','unconfirmed')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE axiomos_commercial.qa_provider_delivery_events (
 provider text NOT NULL CHECK(provider IN ('telnyx','dualhook')),
 event_key text NOT NULL CHECK(length(event_key) BETWEEN 8 AND 200),
 provider_message_id text NOT NULL REFERENCES axiomos_commercial.qa_provider_receipts(provider_message_id) ON DELETE RESTRICT,
 status text NOT NULL CHECK(status IN ('sent','delivered','read','failed','unconfirmed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (provider,event_key)
);

REVOKE ALL ON axiomos_commercial.qa_provider_receipts,axiomos_commercial.qa_provider_delivery_events FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.qa_store_provider_acceptance(p_outbox_id bigint,p_provider text,p_provider_message_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE s text; ch text; affected integer;
BEGIN
 IF session_user <> 'neondb_owner' OR current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 IF p_provider NOT IN ('telnyx','dualhook') OR p_provider_message_id !~ '^[a-zA-Z0-9._-]{8,150}$' THEN
   RETURN 'INVALID_PROVIDER_RECEIPT';
 END IF;
 SELECT status,channel INTO s,ch FROM axiomos_commercial.qa_delivery_outbox WHERE id=p_outbox_id FOR UPDATE;
 IF s IS DISTINCT FROM 'claimed' THEN RETURN 'REJECTED_NOT_CLAIMED'; END IF;
 IF (p_provider='telnyx' AND ch<>'sms') OR (p_provider='dualhook' AND ch<>'whatsapp')
   THEN RETURN 'CHANNEL_MISMATCH'; END IF;
 INSERT INTO axiomos_commercial.qa_provider_receipts(outbox_id,provider,provider_message_id)
 VALUES(p_outbox_id,p_provider,p_provider_message_id) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RETURN 'DUPLICATE_PROVIDER_ID'; END IF;
 UPDATE axiomos_commercial.qa_delivery_outbox SET status='accepted',audit_note='PROVIDER_ACCEPTED_NOT_DELIVERED'
 WHERE id=p_outbox_id AND status='claimed';
 RETURN 'ACCEPTED_RECORDED_NO_DELIVERY';
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.qa_store_provider_acceptance(bigint,text,text) FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.qa_apply_verified_delivery_event(
 p_provider text,p_provider_message_id text,p_event_key text,p_status text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE old_state text; wanted text; affected integer;
BEGIN
 IF session_user <> 'neondb_owner' OR current_user <> 'neondb_owner' THEN
  RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 wanted=CASE WHEN p_status IN ('delivery_failed','sending_failed','failed') THEN 'failed'
    WHEN p_status IN ('delivery_unconfirmed','unconfirmed') THEN 'unconfirmed'
    WHEN p_status IN ('sent','delivered','read') THEN p_status ELSE NULL END;
 IF p_provider NOT IN ('telnyx','dualhook') OR wanted IS NULL OR
    length(coalesce(p_event_key,'')) NOT BETWEEN 8 AND 200 THEN RETURN 'INVALID_EVENT'; END IF;
 SELECT delivery_state INTO old_state
 FROM axiomos_commercial.qa_provider_receipts
 WHERE provider=p_provider AND provider_message_id=p_provider_message_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'UNKNOWN_MESSAGE_ID'; END IF;
 INSERT INTO axiomos_commercial.qa_provider_delivery_events(provider,event_key,provider_message_id,status)
 VALUES(p_provider,p_event_key,p_provider_message_id,wanted) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RETURN 'DUPLICATE_EVENT'; END IF;
 IF old_state IN ('failed','unconfirmed','read') OR
    (old_state='delivered' AND wanted NOT IN ('read','delivered')) OR
    (old_state='sent' AND wanted='accepted') THEN RETURN 'IGNORED_TERMINAL_OR_STALE'; END IF;
 IF old_state=wanted THEN RETURN 'ALREADY_AT_STATUS'; END IF;
 UPDATE axiomos_commercial.qa_provider_receipts SET delivery_state=wanted,updated_at=clock_timestamp()
 WHERE provider=p_provider AND provider_message_id=p_provider_message_id;
 RETURN 'EVENT_RECORDED';
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.qa_apply_verified_delivery_event(text,text,text,text) FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer;
COMMIT;
