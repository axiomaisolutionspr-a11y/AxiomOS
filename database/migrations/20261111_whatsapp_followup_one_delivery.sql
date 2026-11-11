-- The DBA can arm one internal pilot after the recipient authorizes it.
BEGIN;
CREATE TABLE axiomos_commercial.whatsapp_followup_pilot (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[a-f0-9]{64}$'),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > authorized_at),
  actor_id uuid,
  attempted_at timestamptz,
  outcome text CHECK (outcome IN ('accepted', 'held', 'rejected', 'unknown')),
  provider_message_id text CHECK (length(provider_message_id) <= 255)
);

REVOKE ALL ON axiomos_commercial.whatsapp_followup_pilot
FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.claim_whatsapp_followup_pilot(p_actor uuid, p_recipient_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF session_user <> 'axiomos_commercial_writer' OR NOT EXISTS (
    SELECT 1 FROM axiomos_identity.memberships
    WHERE tenant_id='axiomai' AND user_id=p_actor AND role='owner' AND status='active'
  ) THEN
    RAISE EXCEPTION 'Pilot access denied' USING ERRCODE='42501';
  END IF;
  UPDATE axiomos_commercial.whatsapp_followup_pilot
  SET actor_id=p_actor, attempted_at=now()
  WHERE singleton AND recipient_hash=p_recipient_hash AND attempted_at IS NULL AND expires_at>now();
  RETURN FOUND;
END $$;

CREATE FUNCTION axiomos_commercial.finish_whatsapp_followup_pilot(p_actor uuid, p_outcome text, p_provider_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF session_user <> 'axiomos_commercial_writer' THEN
    RAISE EXCEPTION 'Pilot access denied' USING ERRCODE='42501';
  END IF;
  UPDATE axiomos_commercial.whatsapp_followup_pilot
  SET outcome=p_outcome, provider_message_id=p_provider_id
  WHERE singleton AND actor_id=p_actor AND attempted_at IS NOT NULL AND outcome IS NULL
    AND p_outcome IN ('accepted','held','rejected','unknown');
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.claim_whatsapp_followup_pilot(uuid,text),
  axiomos_commercial.finish_whatsapp_followup_pilot(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.claim_whatsapp_followup_pilot(uuid,text),
  axiomos_commercial.finish_whatsapp_followup_pilot(uuid,text,text) TO axiomos_commercial_writer;
COMMIT;
