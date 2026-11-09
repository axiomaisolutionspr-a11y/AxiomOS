-- Neon QA child branch only. Provider GET reconciliation is NOT a signed webhook.
BEGIN;
CREATE TABLE axiomos_commercial.qa_e2e_provider_checks (
 one_shot_id BIGINT NOT NULL REFERENCES axiomos_commercial.qa_e2e_one_shot(id),
 provider_message_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','sending','sent','delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired')),
 source TEXT NOT NULL DEFAULT 'telnyx_api' CHECK(source='telnyx_api'),
 checked_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (one_shot_id,state,source)
);
REVOKE ALL ON axiomos_commercial.qa_e2e_provider_checks
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_e2e_get_receipt(p_owner UUID)
RETURNS TABLE(id BIGINT,provider_message_id TEXT,state TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,axiomos_identity
AS $$
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner' THEN
  RAISE EXCEPTION 'QA service role only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships
  WHERE tenant_id='axiomai' AND user_id=p_owner AND role='owner' AND status='active') THEN
  RAISE EXCEPTION 'QA owner required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT q.id,q.provider_message_id,q.state
  FROM axiomos_commercial.qa_e2e_one_shot q
  WHERE q.tenant_id='axiomai' AND q.approved_by=p_owner AND q.channel='sms'
  LIMIT 1;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_e2e_get_receipt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_e2e_get_receipt(UUID) TO axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_e2e_record_telnyx_lookup(
 p_owner UUID,p_provider_message_id TEXT,p_status TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial,axiomos_identity
AS $$
DECLARE row_id BIGINT; previous TEXT; terminal TEXT;
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner'
 THEN RAISE EXCEPTION 'QA service role only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships m WHERE m.tenant_id='axiomai'
   AND m.user_id=p_owner AND m.role='owner' AND m.status='active')
 THEN RAISE EXCEPTION 'QA owner required' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('queued','sending','sent','delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired')
 THEN RETURN 'INVALID_PROVIDER_STATUS'; END IF;
 SELECT q.id,q.state INTO row_id,previous
 FROM axiomos_commercial.qa_e2e_one_shot q
 WHERE q.tenant_id='axiomai' AND q.approved_by=p_owner
 AND q.channel='sms' AND q.provider_message_id=p_provider_message_id
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'UNKNOWN_PROVIDER_MESSAGE'; END IF;
 INSERT INTO axiomos_commercial.qa_e2e_provider_checks(one_shot_id,provider_message_id,state)
 VALUES(row_id,p_provider_message_id,p_status) ON CONFLICT DO NOTHING;
 terminal=CASE WHEN p_status='delivered' THEN 'delivered'
  WHEN p_status IN ('delivery_failed','sending_failed','expired') THEN 'failed'
  WHEN p_status='delivery_unconfirmed' THEN 'unconfirmed'
  WHEN p_status='sent' THEN 'sent' ELSE NULL END;
 IF previous IN ('delivered','failed','unconfirmed') OR terminal IS NULL
 THEN RETURN 'RECORDED_NO_STATE_CHANGE'; END IF;
 IF terminal='sent' AND previous NOT IN ('accepted','sent')
 THEN RETURN 'STALE_IGNORED'; END IF;
 IF terminal IS NOT NULL THEN
  UPDATE axiomos_commercial.qa_e2e_one_shot SET state=terminal,updated_at=clock_timestamp()
  WHERE id=row_id AND state IN ('accepted','sent');
 END IF;
 RETURN CASE WHEN terminal='delivered' THEN 'TELNYX_API_DELIVERY_CONFIRMED'
             ELSE 'TELNYX_API_STATUS_RECORDED' END;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_e2e_record_telnyx_lookup(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_e2e_record_telnyx_lookup(UUID,TEXT,TEXT) TO axiomos_autopilot_e2e_worker;
COMMIT;
