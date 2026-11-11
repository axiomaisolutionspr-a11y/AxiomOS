-- Install on the isolated branch first. The worker role is inert until provisioned.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='axiomos_whatsapp_followup_worker') THEN
    CREATE ROLE axiomos_whatsapp_followup_worker NOLOGIN;
  END IF;
END $$;

CREATE TABLE axiomos_commercial.whatsapp_followup_authorizations (
  queue_id bigint PRIMARY KEY REFERENCES axiomos_commercial.followup_queue(id) ON DELETE RESTRICT,
  consent_id bigint NOT NULL REFERENCES axiomos_commercial.followup_contact_permissions(id) ON DELETE RESTRICT,
  recipient text NOT NULL CHECK (recipient ~ '^1(787|939)[0-9]{7}$'),
  owner_id uuid NOT NULL,
  authorized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK (expires_at > authorized_at),
  revoked_at timestamptz
);

-- One canonical phone across prospect duplicates. Only the database owner / trusted
-- reconciliation process may attest source coverage, never the worker or browser.
CREATE TABLE axiomos_commercial.whatsapp_followup_coverage (
  recipient text PRIMARY KEY CHECK (recipient ~ '^1(787|939)[0-9]{7}$'),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 250),
  covered_from timestamptz NOT NULL,
  covered_through timestamptz NOT NULL CHECK (covered_from <= covered_through),
  last_inbound_at timestamptz NOT NULL CHECK (last_inbound_at <= covered_through),
  global_suppressed boolean NOT NULL,
  whatsapp_suppressed boolean NOT NULL,
  external_attempts_7d integer NOT NULL CHECK (external_attempts_7d >= 0),
  last_external_attempt_at timestamptz,
  CHECK (last_external_attempt_at <= covered_through),
  CHECK (external_attempts_7d = 0 OR last_external_attempt_at IS NOT NULL)
);

CREATE TABLE axiomos_commercial.whatsapp_followup_attempts (
  queue_id bigint PRIMARY KEY REFERENCES axiomos_commercial.whatsapp_followup_authorizations(queue_id) ON DELETE RESTRICT,
  recipient text NOT NULL,
  followup_local_day date NOT NULL,
  authorization_owner_id uuid NOT NULL,
  consent_id bigint NOT NULL,
  coverage_reference text NOT NULL,
  coverage_through timestamptz NOT NULL,
  claim_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  claimed_at timestamptz NOT NULL,
  outcome text CHECK (outcome IN ('accepted','held','rejected','unknown')),
  provider_message_id text UNIQUE,
  finished_at timestamptz,
  UNIQUE (recipient,followup_local_day),
  CHECK ((outcome IS NULL) = (finished_at IS NULL)),
  CHECK ((provider_message_id IS NOT NULL) = coalesce(outcome IN ('accepted','held'), false)),
  CHECK (provider_message_id ~ '^wamid\.[A-Za-z0-9_+=/-]{1,249}$')
);
CREATE INDEX whatsapp_followup_attempts_recipient_idx
  ON axiomos_commercial.whatsapp_followup_attempts (recipient,claimed_at DESC);

REVOKE ALL ON axiomos_commercial.whatsapp_followup_authorizations,
  axiomos_commercial.whatsapp_followup_coverage,
  axiomos_commercial.whatsapp_followup_attempts
FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer, axiomos_whatsapp_followup_worker;

CREATE FUNCTION axiomos_commercial.whatsapp_followup_pr_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT CASE WHEN digits ~ '^1(787|939)[0-9]{7}$' THEN digits
              WHEN digits ~ '^(787|939)[0-9]{7}$' THEN '1'||digits END
  FROM (SELECT regexp_replace(p_phone,'[^0-9]','','g') AS digits) normalized
  WHERE p_phone ~ '^[+0-9(). -]+$'
$$;

CREATE FUNCTION axiomos_commercial.claim_whatsapp_followup_at(checked_at timestamptz)
RETURNS TABLE(claim_id uuid, recipient text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  candidate record;
BEGIN
  IF session_user <> 'axiomos_whatsapp_followup_worker' THEN
    RAISE EXCEPTION 'Follow-up worker access denied' USING ERRCODE='42501';
  END IF;
  IF EXTRACT(HOUR FROM checked_at AT TIME ZONE 'America/Puerto_Rico') NOT BETWEEN 9 AND 17
     OR NOT pg_try_advisory_xact_lock(951374, 861112) THEN
    RETURN;
  END IF;

  SELECT q.id AS queue_id, a.recipient, a.owner_id, a.consent_id,
         c.source_reference, c.covered_through,
         (p.follow_up_at AT TIME ZONE 'America/Puerto_Rico')::date AS followup_local_day
  INTO candidate
  FROM axiomos_commercial.followup_queue q
  JOIN axiomos_commercial.whatsapp_followup_authorizations a ON a.queue_id=q.id
  JOIN axiomos_commercial.whatsapp_followup_coverage c ON c.recipient=a.recipient
  JOIN public.prospects p ON p.id=q.prospect_id
  JOIN axiomos_identity.memberships m ON m.tenant_id=q.tenant_id AND m.user_id=a.owner_id
  JOIN LATERAL (
    SELECT permission.id, permission.permission_state, permission.recorded_at
    FROM axiomos_commercial.followup_contact_permissions permission
    WHERE permission.tenant_id=q.tenant_id AND permission.prospect_id=q.prospect_id
      AND permission.channel=q.channel AND permission.purpose=q.purpose
    ORDER BY permission.recorded_at DESC,permission.id DESC LIMIT 1
  ) latest ON latest.id=a.consent_id
  WHERE q.tenant_id='axiomai' AND q.status='needs_review' AND q.scheduled_for<=checked_at
    AND q.channel='whatsapp' AND q.purpose='followup'
    AND m.role='owner' AND m.status='active'
    AND a.authorized_at<=checked_at AND a.expires_at>checked_at AND a.revoked_at IS NULL
    AND p.crm_stage IN ('Interesado','Seguimiento') AND p.follow_up_at<=q.scheduled_for
    AND axiomos_commercial.whatsapp_followup_pr_phone(p.caller_phone)=a.recipient
    AND latest.permission_state='opt_in'
    AND latest.recorded_at<=a.authorized_at AND latest.recorded_at>checked_at-interval '90 days'
    AND c.covered_from<=checked_at-interval '7 days'
    AND c.covered_through BETWEEN checked_at-interval '2 minutes' AND checked_at
    AND c.last_inbound_at>checked_at-interval '24 hours'+interval '15 seconds'
    AND NOT c.global_suppressed AND NOT c.whatsapp_suppressed
    AND (c.last_external_attempt_at IS NULL OR c.last_external_attempt_at<=checked_at-interval '24 hours')
    AND c.external_attempts_7d+(
      SELECT count(*) FROM axiomos_commercial.whatsapp_followup_attempts prev
      WHERE prev.recipient=a.recipient AND prev.claimed_at>checked_at-interval '7 days'
    )<2
    AND NOT EXISTS (
      SELECT FROM axiomos_commercial.followup_review_decisions d
      WHERE d.tenant_id=q.tenant_id AND d.queue_id=q.id AND d.decision='blocked'
    )
    AND NOT EXISTS (
      SELECT FROM axiomos_commercial.followup_contact_permissions opt_out
      JOIN public.prospects contact ON contact.id=opt_out.prospect_id
      WHERE opt_out.tenant_id=q.tenant_id AND opt_out.channel='whatsapp' AND opt_out.purpose=q.purpose
        AND opt_out.permission_state='opt_out' AND opt_out.recorded_at>=latest.recorded_at
        AND axiomos_commercial.whatsapp_followup_pr_phone(contact.caller_phone)=a.recipient
    )
    AND NOT EXISTS (
      SELECT FROM axiomos_commercial.whatsapp_followup_attempts prev
      WHERE prev.queue_id=q.id OR (
        prev.recipient=a.recipient AND (prev.claimed_at>checked_at-interval '24 hours'
          OR prev.followup_local_day=(p.follow_up_at AT TIME ZONE 'America/Puerto_Rico')::date
          OR prev.outcome IS NULL OR prev.outcome IN ('unknown','held'))
      )
    )
  ORDER BY q.scheduled_for,q.id
  LIMIT 1
  FOR UPDATE OF q,a,c,p SKIP LOCKED;

  IF FOUND THEN
    RETURN QUERY INSERT INTO axiomos_commercial.whatsapp_followup_attempts AS attempt
      (queue_id,recipient,followup_local_day,authorization_owner_id,consent_id,
       coverage_reference,coverage_through,claimed_at)
    VALUES (candidate.queue_id,candidate.recipient,candidate.followup_local_day,candidate.owner_id,
            candidate.consent_id,candidate.source_reference,candidate.covered_through,checked_at)
    ON CONFLICT DO NOTHING
    RETURNING attempt.claim_id,attempt.recipient;
  END IF;
END $$;

CREATE FUNCTION axiomos_commercial.claim_whatsapp_followup()
RETURNS TABLE(claim_id uuid, recipient text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT * FROM axiomos_commercial.claim_whatsapp_followup_at(clock_timestamp())
$$;

CREATE FUNCTION axiomos_commercial.finish_whatsapp_followup(p_claim_id uuid,p_outcome text,p_provider_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF session_user <> 'axiomos_whatsapp_followup_worker' THEN
    RAISE EXCEPTION 'Follow-up worker access denied' USING ERRCODE='42501';
  END IF;
  UPDATE axiomos_commercial.whatsapp_followup_attempts
  SET outcome=p_outcome,provider_message_id=p_provider_id,finished_at=clock_timestamp()
  WHERE claim_id=p_claim_id AND outcome IS NULL
    AND p_outcome IN ('accepted','held','rejected','unknown');
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION axiomos_commercial.whatsapp_followup_pr_phone(text),
  axiomos_commercial.claim_whatsapp_followup_at(timestamptz),
  axiomos_commercial.claim_whatsapp_followup(),
  axiomos_commercial.finish_whatsapp_followup(uuid,text,text)
FROM PUBLIC, axiomos_commercial_reader, axiomos_commercial_writer;
GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_whatsapp_followup_worker;
GRANT EXECUTE ON FUNCTION axiomos_commercial.claim_whatsapp_followup(),
  axiomos_commercial.finish_whatsapp_followup(uuid,text,text)
TO axiomos_whatsapp_followup_worker;
COMMIT;
