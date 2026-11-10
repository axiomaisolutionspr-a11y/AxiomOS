-- AxiomOS QA-only transactional audit worker. NEVER sends or reserves a real message.
-- Requires qa_audit_followup_transaction (consent/frequency/suppression v3).
-- No provider credentials. No production migration. Idempotent on the run key.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE TABLE axiomos_commercial.qa_worker_audit_runs (
 run_key text PRIMARY KEY CHECK(run_key ~ '^QA-RUN-[A-Z0-9_-]{8,72}$'),
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
 checked_at timestamptz NOT NULL,
 reviewed integer NOT NULL CHECK(reviewed BETWEEN 0 AND 100),
 blocked integer NOT NULL CHECK(blocked BETWEEN 0 AND 100),
 decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
 mode text NOT NULL DEFAULT 'audit_no_send' CHECK(mode='audit_no_send'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT qa_worker_all_denied CHECK(reviewed=blocked)
);
REVOKE ALL ON axiomos_commercial.qa_worker_audit_runs
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_run_worker_audit(
 p_run_key text,p_now timestamptz,p_limit integer
) RETURNS TABLE(run_key text,reviewed integer,blocked integer,result text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE existing record; r record; reason text; n integer:=0;
        breakdown jsonb:='{}'::jsonb;
BEGIN
 IF session_user NOT IN ('neondb_owner','postgres') THEN
   RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 IF p_run_key IS NULL OR p_run_key !~ '^QA-RUN-[A-Z0-9_-]{8,72}$'
    OR p_limit IS NULL OR p_limit<1 OR p_limit>100 OR p_now IS NULL
    OR p_now>clock_timestamp()+interval '1 minute' THEN
   RETURN QUERY SELECT coalesce(p_run_key,'INVALID')::text,0,0,'INVALID_REQUEST'::text;
   RETURN;
 END IF;
 -- Only one cycle per QA tenant at a time; no duplicated scans or writes.
 IF NOT pg_try_advisory_xact_lock(907202611,103) THEN
   RETURN QUERY SELECT p_run_key,0,0,'BUSY_NO_SEND'::text;
   RETURN;
 END IF;
 SELECT w.run_key,w.reviewed,w.blocked INTO existing
 FROM axiomos_commercial.qa_worker_audit_runs w
 WHERE w.run_key=p_run_key FOR UPDATE;
 IF FOUND THEN
   RETURN QUERY SELECT existing.run_key::text,existing.reviewed::integer,
           existing.blocked::integer,'DUPLICATE_NO_SEND'::text;
   RETURN;
 END IF;
 FOR r IN SELECT q.id FROM axiomos_commercial.followup_queue q
  WHERE q.tenant_id='axiomai' AND q.status='needs_review'
  ORDER BY q.id LIMIT p_limit
 LOOP
   reason:=axiomos_commercial.qa_audit_followup_transaction(r.id,p_now);
   IF reason NOT LIKE 'BLOCKED_%' THEN
     RAISE EXCEPTION 'Unsafe QA audit outcome blocked' USING ERRCODE='42501';
   END IF;
   n:=n+1;
   breakdown:=jsonb_set(breakdown,ARRAY[reason],
     to_jsonb(coalesce((breakdown->>reason)::integer,0)+1),true);
 END LOOP;
 INSERT INTO axiomos_commercial.qa_worker_audit_runs
  (run_key,checked_at,reviewed,blocked,decisions)
 VALUES (p_run_key,p_now,n,n,breakdown);
 RETURN QUERY SELECT p_run_key,n,n,'AUDITED_NO_SEND'::text;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_run_worker_audit(text,timestamptz,integer)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
COMMIT;
