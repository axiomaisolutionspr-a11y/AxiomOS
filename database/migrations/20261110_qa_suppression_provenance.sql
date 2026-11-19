-- QA ONLY. Evidence of opt-out/suppression, no send or grant of dispatch permission.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
CREATE TABLE axiomos_commercial.qa_suppression_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK(channel IN ('global','sms','whatsapp')),
 event_type text NOT NULL CHECK(event_type IN ('opt_out','blocked','opt_in')),
 source_system text NOT NULL CHECK(source_system IN ('provider_verified','manual_verified')),
 source_event_key text NOT NULL CHECK(length(source_event_key) BETWEEN 8 AND 180),
 occurred_at timestamptz NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(tenant_id,source_system,source_event_key)
);
CREATE INDEX qa_suppression_latest ON axiomos_commercial.qa_suppression_events
 (tenant_id,prospect_id,channel,occurred_at DESC,id DESC);
CREATE TABLE axiomos_commercial.qa_suppression_coverage (
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK(tenant_id='axiomai'),
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK(channel IN ('sms','whatsapp')),
 complete boolean NOT NULL DEFAULT false,
 verified_through timestamptz,
 verified_at timestamptz,
 source_evidence text,
 PRIMARY KEY(tenant_id,prospect_id,channel),
 CHECK(NOT complete OR
  (verified_at IS NOT NULL AND verified_through IS NOT NULL AND
   length(btrim(coalesce(source_evidence,'')))>=8))
);
REVOKE ALL ON axiomos_commercial.qa_suppression_events,
 axiomos_commercial.qa_suppression_coverage FROM PUBLIC,
 axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
CREATE FUNCTION axiomos_commercial.qa_suppression_evidence(
 p_prospect_id bigint,p_channel text,p_now timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,axiomos_commercial
AS $$
DECLARE c record; latest_global record;latest_channel record;
BEGIN
 IF session_user NOT IN ('neondb_owner','postgres') THEN
  RAISE EXCEPTION 'QA owner only' USING ERRCODE='42501';
 END IF;
 IF p_prospect_id IS NULL OR p_channel NOT IN ('sms','whatsapp') OR p_now IS NULL
 THEN RETURN 'UNKNOWN'; END IF;
 -- An opt-out is authoritative even if coverage has gaps.
 SELECT event_type INTO latest_global
 FROM axiomos_commercial.qa_suppression_events
 WHERE tenant_id='axiomai' AND prospect_id=p_prospect_id
 AND channel='global' AND occurred_at<=p_now
 ORDER BY occurred_at DESC,id DESC LIMIT 1;
 SELECT event_type INTO latest_channel
 FROM axiomos_commercial.qa_suppression_events
 WHERE tenant_id='axiomai' AND prospect_id=p_prospect_id
 AND channel=p_channel AND occurred_at<=p_now
 ORDER BY occurred_at DESC,id DESC LIMIT 1;
 IF latest_global.event_type IN ('opt_out','blocked')
  OR latest_channel.event_type IN ('opt_out','blocked')
 THEN RETURN 'SUPPRESSED'; END IF;
 SELECT * INTO c FROM axiomos_commercial.qa_suppression_coverage
 WHERE tenant_id='axiomai' AND prospect_id=p_prospect_id AND channel=p_channel;
 IF NOT FOUND OR c.complete IS DISTINCT FROM true OR
   c.verified_at IS NULL OR c.verified_at>p_now OR
   c.verified_at<p_now-interval '1 hour' OR
   c.verified_through IS NULL OR c.verified_through<p_now-interval '5 minutes'
 THEN RETURN 'UNKNOWN'; END IF;
 -- A fresh coverage record is informational only, not permission to dispatch.
 RETURN 'NO_SUPPRESSION_EVIDENCED';
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.qa_suppression_evidence(bigint,text,timestamptz)
 FROM PUBLIC,axiomos_commercial_reader,axiomos_commercial_writer,
 axiomos_autopilot_e2e_reader,axiomos_autopilot_e2e_worker;
COMMIT;
