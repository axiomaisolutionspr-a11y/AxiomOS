-- One-shot owner-only Telnyx certification; no CRM campaign sends.
CREATE TABLE axiomos_commercial.sms_certification_attempt (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 test_key text NOT NULL UNIQUE CHECK(test_key='AXIOMAI-TELNYX-SMS-CERT-20261109'),
 actor_id uuid NOT NULL,
 recipient_hint text NOT NULL DEFAULT '***0132' CHECK(recipient_hint='***0132'),
 started_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL PRIVILEGES ON axiomos_commercial.sms_certification_attempt FROM axiomos_commercial_reader,axiomos_commercial_writer;
CREATE FUNCTION axiomos_commercial.claim_one_sms_cert_test(p_actor uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial AS $$
DECLARE added bigint;
BEGIN
 IF session_user <> 'axiomos_commercial_writer' THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND user_id=p_actor AND role='owner' AND status='active') THEN RAISE EXCEPTION 'Not owner' USING ERRCODE='42501'; END IF;
 INSERT INTO axiomos_commercial.sms_certification_attempt(test_key,actor_id)
 VALUES('AXIOMAI-TELNYX-SMS-CERT-20261109',p_actor)
 ON CONFLICT(test_key) DO NOTHING RETURNING id INTO added;
 RETURN added IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.claim_one_sms_cert_test(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.claim_one_sms_cert_test(uuid) TO axiomos_commercial_writer;
-- QA verified: 1st owner claim true, duplicate false, operator & reader 42501.
