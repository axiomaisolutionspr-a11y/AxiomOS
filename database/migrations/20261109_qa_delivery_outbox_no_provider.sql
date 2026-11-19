-- ISOLATED Neon QA ONLY. Never deploy to production.
-- Synthetic policy verification; no provider, phone numbers or payloads.
-- Keep followup_queue_no_live_dispatch unchanged.
BEGIN;
CREATE TABLE axiomos_commercial.qa_delivery_outbox (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 test_key text NOT NULL UNIQUE CHECK (test_key ~ '^QA-[A-Z0-9_-]{4,70}$'),
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK (tenant_id='axiomai'),
 channel text NOT NULL CHECK (channel IN ('sms','whatsapp')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','accepted','uncertain','failed','cancelled')),
 is_synthetic boolean NOT NULL DEFAULT true CHECK(is_synthetic),
 authorized boolean NOT NULL DEFAULT false,
 opt_in boolean NOT NULL DEFAULT false,
 suppressed boolean NOT NULL DEFAULT false,
 due_at timestamptz NOT NULL,
 claim_at timestamptz,
 attempts int NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 1),
 audit_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT qa_claim_shape CHECK(status <> 'claimed' OR (claim_at IS NOT NULL AND attempts=1))
);

REVOKE ALL ON axiomos_commercial.qa_delivery_outbox FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;

REVOKE ALL ON SEQUENCE axiomos_commercial.qa_delivery_outbox_id_seq FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.qa_claim_next_delivery(p_now timestamptz)
RETURNS TABLE(outbox_id bigint,test_key text,claim_result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial
AS $$
BEGIN
  IF current_user <> 'neondb_owner' OR session_user <> 'neondb_owner' THEN
    RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
  END IF;
  IF p_now IS NULL THEN RAISE EXCEPTION 'Missing clock' USING ERRCODE='22023'; END IF;
  RETURN QUERY
  WITH candidate AS (
   SELECT q.id
   FROM axiomos_commercial.qa_delivery_outbox q
   WHERE q.tenant_id='axiomai' AND q.status='pending'
     AND q.is_synthetic AND q.authorized AND q.opt_in AND NOT q.suppressed
     AND q.due_at <= p_now
     AND EXTRACT(HOUR FROM p_now AT TIME ZONE 'America/Puerto_Rico') >= 9
     AND EXTRACT(HOUR FROM p_now AT TIME ZONE 'America/Puerto_Rico') < 18
   ORDER BY q.id
   FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE axiomos_commercial.qa_delivery_outbox q
  SET status='claimed',claim_at=clock_timestamp(),attempts=attempts+1,
      audit_note='SIMULATED_CLAIM_NO_PROVIDER'
  FROM candidate c WHERE q.id=c.id AND q.attempts=0
  RETURNING q.id,q.test_key,'SIMULATED_NO_SEND'::text;
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.qa_claim_next_delivery(timestamptz) FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.qa_record_delivery_outcome(p_id bigint,p_outcome text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE updated_count int;
BEGIN
 IF current_user <> 'neondb_owner' OR session_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 IF p_outcome NOT IN ('accepted','uncertain','failed') THEN
   RAISE EXCEPTION 'invalid outcome' USING ERRCODE='22023';
 END IF;
 UPDATE axiomos_commercial.qa_delivery_outbox
 SET status=p_outcome,audit_note='QA_SIMULATION_'||upper(p_outcome)
 WHERE id=p_id AND status='claimed';
 GET DIAGNOSTICS updated_count=ROW_COUNT;
 IF updated_count <> 1 THEN RETURN 'REJECTED_NOT_CLAIMED'; END IF;
 RETURN 'RECORDED_NO_PROVIDER';
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.qa_record_delivery_outcome(bigint,text) FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;
COMMIT;
