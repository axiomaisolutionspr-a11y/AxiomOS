-- One-time Telnyx QA signed webhook probe, isolated Neon child branch only.
-- Never apply to production. No existing customer/CRM table modified.
BEGIN;
CREATE TABLE axiomos_commercial.qa_telnyx_signed_probe (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
 approved_by uuid NOT NULL,
 recipient text NOT NULL CHECK(recipient='+17872320132'),
 body text NOT NULL CHECK(body='AxiomAI Solutions: prueba unica de webhook firmado Telnyx. No responder.'),
 webhook_url text NOT NULL CHECK(webhook_url='https://axiomos-qa-telnyx-webhook.vercel.app/api/telnyx'),
 consent_evidence text NOT NULL CHECK(length(consent_evidence)>20),
 approved_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','claimed','accepted','uncertain','rejected')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1),
 claimed_at timestamptz,
 provider_message_id text UNIQUE,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT qa_signed_probe_claim CHECK(state='ready' OR (attempts=1 AND claimed_at IS NOT NULL))
);
REVOKE ALL ON axiomos_commercial.qa_telnyx_signed_probe FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
REVOKE ALL ON SEQUENCE axiomos_commercial.qa_telnyx_signed_probe_id_seq FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_telnyx_signed_probe_claim(p_owner uuid)
RETURNS TABLE(id bigint,recipient text,body text,webhook_url text,approved_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,axiomos_identity
AS $$
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'QA worker only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships
  WHERE tenant_id='axiomai' AND user_id=p_owner AND role='owner' AND status='active')
 THEN RAISE EXCEPTION 'QA owner required' USING ERRCODE='42501'; END IF;
 IF EXTRACT(HOUR FROM clock_timestamp() AT TIME ZONE 'America/Puerto_Rico') NOT BETWEEN 9 AND 17 THEN RETURN; END IF;
 RETURN QUERY WITH candidate AS (
  SELECT p.id FROM axiomos_commercial.qa_telnyx_signed_probe p
  WHERE p.state='ready' AND p.attempts=0 AND p.approved_by=p_owner
   AND p.approved_at <= clock_timestamp() AND p.expires_at>clock_timestamp()
  FOR UPDATE SKIP LOCKED LIMIT 1
 )
 UPDATE axiomos_commercial.qa_telnyx_signed_probe p SET
  state='claimed',attempts=1,claimed_at=clock_timestamp(),updated_at=clock_timestamp()
 FROM candidate c WHERE c.id=p.id
 RETURNING p.id,p.recipient,p.body,p.webhook_url,p.approved_at;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_claim(uuid) TO axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_telnyx_signed_probe_finish(p_id bigint,p_state text,p_provider_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE affected int;
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner'
 THEN RAISE EXCEPTION 'QA worker only' USING ERRCODE='42501'; END IF;
 IF p_state NOT IN ('accepted','uncertain','rejected') OR
 (p_state='accepted' AND (p_provider_id IS NULL OR p_provider_id !~ '^[A-Za-z0-9-]{8,100}$'))
 THEN RETURN 'INVALID_RESULT'; END IF;
 UPDATE axiomos_commercial.qa_telnyx_signed_probe SET
 state=p_state,provider_message_id=CASE WHEN p_state='accepted' THEN p_provider_id ELSE NULL END,
 updated_at=clock_timestamp()
 WHERE id=p_id AND state='claimed' AND attempts=1;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN CASE WHEN affected=1 THEN 'RECORDED_NO_RETRY' ELSE 'STATE_ALREADY_SETTLED' END;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_finish(bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_finish(bigint,text,text) TO axiomos_autopilot_e2e_worker;

CREATE FUNCTION axiomos_commercial.qa_telnyx_signed_probe_status(p_owner uuid)
RETURNS TABLE(id bigint,state text,attempts integer,provider_message_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,axiomos_identity
AS $$
BEGIN
 IF session_user <> 'axiomos_autopilot_e2e_worker' OR current_user <> 'neondb_owner'
 THEN RAISE EXCEPTION 'QA worker only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships
  WHERE tenant_id='axiomai' AND user_id=p_owner AND role='owner' AND status='active')
 THEN RAISE EXCEPTION 'QA owner required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.id,p.state,p.attempts,p.provider_message_id
 FROM axiomos_commercial.qa_telnyx_signed_probe p
 WHERE p.approved_by=p_owner LIMIT 1;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.qa_telnyx_signed_probe_status(uuid) TO axiomos_autopilot_e2e_worker;
COMMIT;
