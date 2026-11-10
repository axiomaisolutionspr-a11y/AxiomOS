-- QA ONLY: provenance-aware contact history. Does NOT backfill unknown history.
-- No production writes, messaging, recipient PII, or dispatch approvals.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE TABLE axiomos_commercial.qa_contact_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK (tenant_id='axiomai'),
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK (channel IN ('sms','whatsapp')),
 purpose text NOT NULL CHECK (purpose IN ('followup','appointment_reminder')),
 source_system text NOT NULL CHECK (source_system IN ('verified_provider','reconciled_campaign','manual_verified')),
 source_event_key text NOT NULL CHECK (length(source_event_key) BETWEEN 8 AND 180),
 occurred_at timestamptz NOT NULL,
 event_type text NOT NULL CHECK (event_type IN ('accepted','sent','delivered','failed','uncertain')),
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT qa_contact_history_unique UNIQUE(tenant_id,source_system,source_event_key)
);
CREATE INDEX qa_contact_history_window ON axiomos_commercial.qa_contact_history
 (tenant_id,prospect_id,channel,occurred_at DESC);

CREATE TABLE axiomos_commercial.qa_contact_history_coverage (
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK(channel IN ('sms','whatsapp')),
 is_complete boolean NOT NULL DEFAULT false,
 verified_from timestamptz,
 verified_through timestamptz,
 verification_source text,
 verified_at timestamptz,
 CONSTRAINT qa_contact_history_coverage_pkey PRIMARY KEY (tenant_id,prospect_id,channel),
 CONSTRAINT qa_history_coverage_evidence CHECK(
  NOT is_complete OR
   (verified_from IS NOT NULL AND verified_through IS NOT NULL AND
    verified_from <= verified_through AND verified_at IS NOT NULL AND
    length(btrim(coalesce(verification_source,''))) BETWEEN 8 AND 180)
 )
);
REVOKE ALL ON axiomos_commercial.qa_contact_history,
 axiomos_commercial.qa_contact_history_coverage FROM PUBLIC,
 axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;

-- Computes informational frequency evidence only; never returns authorization to send.
CREATE FUNCTION axiomos_commercial.qa_contact_frequency_evidence(
 p_prospect_id bigint,p_channel text,p_now timestamptz
) RETURNS TABLE(
 coverage_valid boolean,contacts_last_24h integer,
 contacts_last_7d integer,last_contact_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE coverage record;
BEGIN
 IF session_user NOT IN ('neondb_owner','postgres') THEN
  RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 IF p_prospect_id IS NULL OR p_channel NOT IN ('sms','whatsapp') OR p_now IS NULL THEN
  RETURN QUERY SELECT false, NULL::integer,NULL::integer,NULL::timestamptz;
  RETURN;
 END IF;
 SELECT * INTO coverage FROM axiomos_commercial.qa_contact_history_coverage
 WHERE tenant_id='axiomai' AND prospect_id=p_prospect_id AND channel=p_channel;
 IF NOT FOUND OR coverage.is_complete IS DISTINCT FROM true OR
    coverage.verified_at IS NULL OR coverage.verified_at>p_now OR
    coverage.verified_at<p_now-interval '1 hour' OR
    coverage.verified_from>p_now-interval '7 days' OR
    coverage.verified_through<p_now-interval '5 minutes' THEN
  RETURN QUERY SELECT false,NULL::integer,NULL::integer,NULL::timestamptz;
  RETURN;
 END IF;
 RETURN QUERY
 SELECT true,
  count(*) FILTER(WHERE h.occurred_at>p_now-interval '24 hours')::integer,
  count(*)::integer,
  max(h.occurred_at)
 FROM axiomos_commercial.qa_contact_history h
 WHERE h.tenant_id='axiomai' AND h.prospect_id=p_prospect_id
  AND h.channel=p_channel AND h.occurred_at<=p_now
  AND h.occurred_at>p_now-interval '7 days'
  AND h.event_type IN ('accepted','sent','delivered','uncertain');
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_contact_frequency_evidence(bigint,text,timestamptz)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
COMMIT;
