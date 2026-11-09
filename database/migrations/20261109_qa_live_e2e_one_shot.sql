-- AxiomOS E2E: isolated Neon child QA branch only. Never run on production main.
-- One SMS to an explicitly authorized internal number, only after owner OTP login
-- and manual button press. No schedule, no automatic retries and no real leads.
BEGIN;
CREATE TABLE axiomos_commercial.qa_e2e_one_shot (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
  channel TEXT NOT NULL DEFAULT 'sms' CHECK(channel='sms'),
  recipient TEXT NOT NULL CHECK(recipient='+17872320132'),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 16 AND 160),
  approved_by UUID NOT NULL,
  consent_source TEXT NOT NULL CHECK(length(consent_source) BETWEEN 10 AND 250),
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','claimed','accepted','uncertain','rejected','sent','delivered','failed','unconfirmed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 1),
  claimed_at TIMESTAMPTZ,
  provider_message_id TEXT UNIQUE CHECK(provider_message_id IS NULL OR length(provider_message_id) BETWEEN 8 AND 150),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (tenant_id,channel),
  CONSTRAINT qa_e2e_claim_guard CHECK(state='ready' OR (attempts=1 AND claimed_at IS NOT NULL))
);
CREATE TABLE axiomos_commercial.qa_e2e_delivery_events (
  event_key TEXT PRIMARY KEY CHECK(length(event_key) BETWEEN 8 AND 200),
  one_shot_id BIGINT NOT NULL REFERENCES axiomos_commercial.qa_e2e_one_shot(id) ON DELETE RESTRICT,
  provider_message_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('sent','delivered','failed','unconfirmed')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);
REVOKE ALL ON axiomos_commercial.qa_e2e_one_shot,axiomos_commercial.qa_e2e_delivery_events
  FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
REVOKE ALL ON SEQUENCE axiomos_commercial.qa_e2e_one_shot_id_seq
  FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;

-- The only way for the API runner to reserve the one permitted SMS.
CREATE FUNCTION axiomos_commercial.qa_e2e_claim_once(p_owner UUID)
RETURNS TABLE(id BIGINT,recipient TEXT,body TEXT,approved_at TIMESTAMPTZ,claimed_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial,axiomos_identity
AS $$
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner' THEN
  RAISE EXCEPTION 'Unauthorized QA service role' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships m
   WHERE m.user_id=p_owner AND m.tenant_id='axiomai' AND m.role='owner' AND m.status='active')
 THEN RAISE EXCEPTION 'Owner authorization missing' USING ERRCODE='42501'; END IF;
 IF EXTRACT(HOUR FROM clock_timestamp() AT TIME ZONE 'America/Puerto_Rico') NOT BETWEEN 9 AND 17 THEN
   RETURN;
 END IF;
 RETURN QUERY
 WITH eligible AS (
  SELECT q.id FROM axiomos_commercial.qa_e2e_one_shot q
  WHERE q.tenant_id='axiomai' AND q.channel='sms'
  AND q.state='ready' AND q.attempts=0 AND q.approved_by=p_owner
  AND q.approved_at <= clock_timestamp() AND q.expires_at > clock_timestamp()
  AND q.recipient='+17872320132'
  FOR UPDATE SKIP LOCKED LIMIT 1
 )
 UPDATE axiomos_commercial.qa_e2e_one_shot q
 SET state='claimed',attempts=1,claimed_at=clock_timestamp(),updated_at=clock_timestamp()
 FROM eligible e WHERE q.id=e.id
 RETURNING q.id,q.recipient,q.body,q.approved_at,q.claimed_at;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_e2e_claim_once(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_e2e_claim_once(UUID) TO axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_e2e_finish_once(p_id BIGINT,p_result TEXT,p_provider_id TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE changed INTEGER;
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner'
 THEN RAISE EXCEPTION 'Unauthorized QA service role' USING ERRCODE='42501'; END IF;
 IF p_result NOT IN ('accepted','uncertain','rejected') OR
  (p_result='accepted' AND (p_provider_id IS NULL OR length(p_provider_id) NOT BETWEEN 8 AND 150))
 THEN RETURN 'INVALID_RESULT'; END IF;
 UPDATE axiomos_commercial.qa_e2e_one_shot
 SET state=p_result,provider_message_id=CASE WHEN p_result='accepted' THEN p_provider_id ELSE NULL END,
 updated_at=clock_timestamp()
 WHERE id=p_id AND state='claimed' AND attempts=1;
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN CASE WHEN changed=1 THEN 'RECORDED_NO_RETRY' ELSE 'STATE_ALREADY_SETTLED' END;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_e2e_finish_once(BIGINT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_e2e_finish_once(BIGINT,TEXT,TEXT) TO axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_e2e_verified_event(
 p_message_id TEXT,p_event_key TEXT,p_status TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE current_state TEXT; target_state TEXT; row_id BIGINT; inserted INTEGER;
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner'
 THEN RAISE EXCEPTION 'Unauthorized QA service role' USING ERRCODE='42501'; END IF;
 target_state=CASE
  WHEN p_status='sent' THEN 'sent'
  WHEN p_status='delivered' THEN 'delivered'
  WHEN p_status IN ('delivery_failed','sending_failed','failed') THEN 'failed'
  WHEN p_status IN ('delivery_unconfirmed','unconfirmed') THEN 'unconfirmed'
  ELSE NULL END;
 IF target_state IS NULL OR length(coalesce(p_event_key,'')) NOT BETWEEN 8 AND 200
 THEN RETURN 'INVALID_EVENT'; END IF;
 SELECT q.id,q.state INTO row_id,current_state
 FROM axiomos_commercial.qa_e2e_one_shot q
 WHERE q.provider_message_id=p_message_id
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'UNKNOWN_MESSAGE'; END IF;
 INSERT INTO axiomos_commercial.qa_e2e_delivery_events(event_key,one_shot_id,provider_message_id,state)
 VALUES(p_event_key,row_id,p_message_id,target_state)
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RETURN 'DUPLICATE_EVENT'; END IF;
 IF current_state IN ('delivered','failed','unconfirmed') THEN RETURN 'STALE_IGNORED'; END IF;
 IF current_state='sent' AND target_state='sent' THEN RETURN 'ALREADY_SENT'; END IF;
 IF current_state NOT IN ('accepted','sent') THEN RETURN 'INVALID_TRANSITION'; END IF;
 UPDATE axiomos_commercial.qa_e2e_one_shot
 SET state=target_state,updated_at=clock_timestamp()
 WHERE id=row_id;
 RETURN 'DELIVERY_RECORDED';
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_e2e_verified_event(TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_e2e_verified_event(TEXT,TEXT,TEXT) TO axiomos_autopilot_e2e_worker;
COMMIT;
