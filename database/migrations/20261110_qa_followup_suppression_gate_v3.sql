-- QA ONLY. Supply verified suppression evidence to the existing transactional
-- consent/frequency gate. It NEVER authorizes an outbound dispatch.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
ALTER TABLE axiomos_commercial.qa_followup_decision_audit
 DROP CONSTRAINT qa_followup_decision_audit_decision_check;
ALTER TABLE axiomos_commercial.qa_followup_decision_audit
 ADD CONSTRAINT qa_followup_decision_audit_decision_check CHECK(decision IN (
 'BLOCKED_STATUS','BLOCKED_REVIEW','BLOCKED_NO_CONSENT',
 'BLOCKED_INVALID_EVIDENCE','BLOCKED_FUTURE','BLOCKED_QUIET_HOURS',
 'BLOCKED_NO_FREQUENCY_SOURCE','BLOCKED_FREQUENCY_24H',
 'BLOCKED_FREQUENCY_7D','BLOCKED_NO_SUPPRESSION_SOURCE',
 'BLOCKED_SUPPRESSED','BLOCKED_NO_DISPATCH_AUTHORIZATION'
));
CREATE OR REPLACE FUNCTION axiomos_commercial.qa_audit_followup_transaction(
  p_queue_id bigint, p_now timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE
  q record;
  consent record;
  review_decision text;
  reason text;
  local_hour integer;
  freq record;
  suppression_result text;
BEGIN
  IF session_user NOT IN ('neondb_owner','postgres') THEN
    RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
  END IF;
  IF p_queue_id IS NULL OR p_queue_id<=0 OR p_now IS NULL THEN
    RETURN 'INVALID_REQUEST';
  END IF;
  SELECT id,tenant_id,prospect_id,channel,purpose,status,scheduled_for
    INTO q FROM axiomos_commercial.followup_queue
    WHERE id=p_queue_id AND tenant_id='axiomai'
    FOR UPDATE;
  IF NOT FOUND THEN RETURN 'QUEUE_NOT_FOUND'; END IF;
  -- Consent records are immutable historical evidence. Lock the matching
  -- rows to prevent concurrent opt-out inserts being mistaken for approval.
  -- This is a defensive QA audit, NOT a production consent/suppression lock.
  SELECT permission_state,evidence_source,recorded_at
    INTO consent FROM axiomos_commercial.followup_contact_permissions
    WHERE tenant_id=q.tenant_id AND prospect_id=q.prospect_id
      AND channel=q.channel AND purpose=q.purpose
    ORDER BY recorded_at DESC,id DESC LIMIT 1 FOR SHARE;
  SELECT decision INTO review_decision
    FROM axiomos_commercial.followup_review_decisions
    WHERE tenant_id=q.tenant_id AND queue_id=q.id FOR SHARE;

  reason:=CASE
    WHEN q.status <> 'needs_review' THEN 'BLOCKED_STATUS'
    WHEN review_decision='blocked' THEN 'BLOCKED_REVIEW'
    WHEN consent.permission_state IS DISTINCT FROM 'opt_in' THEN 'BLOCKED_NO_CONSENT'
    WHEN consent.recorded_at IS NULL OR consent.recorded_at>p_now OR
         consent.recorded_at<=p_now-interval '90 days' OR
         length(btrim(coalesce(consent.evidence_source,'')))<3
      THEN 'BLOCKED_INVALID_EVIDENCE'
    WHEN q.scheduled_for>p_now THEN 'BLOCKED_FUTURE'
    ELSE NULL
  END;
  IF reason IS NULL THEN
    local_hour:=EXTRACT(HOUR FROM p_now AT TIME ZONE 'America/Puerto_Rico');
    IF local_hour<9 OR local_hour>=18 THEN
      reason:='BLOCKED_QUIET_HOURS';
    ELSE
      -- Read the explicit, bounded coverage proof. Never treat absent evidence
      -- or missing outbound events as a verified empty history.
      SELECT coverage_valid,contacts_last_24h,contacts_last_7d,last_contact_at
        INTO freq
      FROM axiomos_commercial.qa_contact_frequency_evidence(
         q.prospect_id,q.channel,p_now
      );
      reason:=CASE
        WHEN freq.coverage_valid IS DISTINCT FROM true
         OR freq.contacts_last_24h IS NULL OR freq.contacts_last_7d IS NULL
          THEN 'BLOCKED_NO_FREQUENCY_SOURCE'
        WHEN freq.contacts_last_24h >= 1 THEN 'BLOCKED_FREQUENCY_24H'
        WHEN freq.contacts_last_7d >= 2 THEN 'BLOCKED_FREQUENCY_7D'
        -- Even with complete frequency, suppression provenance is independently
        -- required. A clean suppression audit still is NOT dispatch approval.
        ELSE NULL
      END;
      IF reason IS NULL THEN
        SELECT axiomos_commercial.qa_suppression_evidence(
          q.prospect_id,q.channel,p_now) INTO suppression_result;
        reason:=CASE
          WHEN suppression_result='SUPPRESSED' THEN 'BLOCKED_SUPPRESSED'
          WHEN suppression_result='NO_SUPPRESSION_EVIDENCED'
            THEN 'BLOCKED_NO_DISPATCH_AUTHORIZATION'
          ELSE 'BLOCKED_NO_SUPPRESSION_SOURCE'
        END;
      END IF;
    END IF;
  END IF;
  INSERT INTO axiomos_commercial.qa_followup_decision_audit(queue_id,decision)
    VALUES(q.id,reason);
  RETURN reason;
END $$;


REVOKE ALL ON FUNCTION axiomos_commercial.qa_audit_followup_transaction(bigint,timestamptz)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
COMMIT;
