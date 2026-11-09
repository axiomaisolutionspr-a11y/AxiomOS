-- QA ONLY. Simulates an outbound claim; NO provider/API, phone numbers, or live dispatch.
-- Apply only on isolated Neon QA branches, never production.
CREATE TABLE axiomos_commercial.qa_dispatch_authorizations (
 queue_id bigint PRIMARY KEY REFERENCES axiomos_commercial.followup_queue(id) ON DELETE RESTRICT,
 owner_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE TABLE axiomos_commercial.qa_dispatch_receipts (
 queue_id bigint PRIMARY KEY REFERENCES axiomos_commercial.followup_queue(id) ON DELETE RESTRICT,
 test_key text NOT NULL DEFAULT 'SIMULATION_ONLY' CHECK (test_key='SIMULATION_ONLY'),
 simulated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
REVOKE ALL ON axiomos_commercial.qa_dispatch_authorizations,axiomos_commercial.qa_dispatch_receipts FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer;
CREATE FUNCTION axiomos_commercial.qa_claim_followup_no_send(p_queue_id bigint,p_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial,public
AS $$
DECLARE q RECORD; perm text; new_rows integer; local_hour integer;
BEGIN
  IF session_user <> 'axiomos_commercial_writer' THEN
    RAISE EXCEPTION 'QA worker role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO q FROM axiomos_commercial.followup_queue
    WHERE id=p_queue_id AND tenant_id='axiomai' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF q.status <> 'needs_review' THEN RETURN 'not_pending'; END IF;
  IF q.channel NOT IN ('sms','whatsapp') THEN RETURN 'channel_not_certified'; END IF;
  IF q.scheduled_for > p_at THEN RETURN 'too_early'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM axiomos_commercial.qa_dispatch_authorizations a
    JOIN axiomos_identity.memberships m
      ON m.user_id=a.owner_id AND m.tenant_id='axiomai' AND m.role='owner' AND m.status='active'
    WHERE a.queue_id=q.id
  ) THEN RETURN 'no_owner_authorization'; END IF;
  SELECT c.permission_state INTO perm FROM axiomos_commercial.followup_contact_permissions c
    WHERE c.tenant_id='axiomai' AND c.prospect_id=q.prospect_id
      AND c.channel=q.channel AND c.purpose=q.purpose
    ORDER BY c.recorded_at DESC,c.id DESC LIMIT 1;
  IF perm IS DISTINCT FROM 'opt_in' THEN RETURN 'blocked_no_current_opt_in'; END IF;
  local_hour:=EXTRACT(HOUR FROM p_at AT TIME ZONE 'America/Puerto_Rico');
  IF local_hour < 9 OR local_hour >= 18 THEN RETURN 'quiet_hours'; END IF;
  INSERT INTO axiomos_commercial.qa_dispatch_receipts(queue_id)
    VALUES(q.id) ON CONFLICT (queue_id) DO NOTHING;
  GET DIAGNOSTICS new_rows=ROW_COUNT;
  IF new_rows=0 THEN RETURN 'duplicate'; END IF;
  RETURN 'SIMULATED_NO_SEND';
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_claim_followup_no_send(bigint,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_claim_followup_no_send(bigint,timestamptz) TO axiomos_commercial_writer;
-- The live followup_queue_no_live_dispatch CHECK is unchanged. This function never calls a provider.
