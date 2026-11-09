-- Safe, idempotent dry-run follow-up generation. No dispatch paths.
CREATE FUNCTION axiomos_commercial.generate_followup_drafts_dryrun()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,public
AS $$
DECLARE inserted integer;
BEGIN
  IF current_user <> 'neondb_owner' AND session_user <> 'axiomos_commercial_writer' THEN
    RAISE EXCEPTION 'Unauthorized database role' USING ERRCODE='42501';
  END IF;
  INSERT INTO axiomos_commercial.followup_queue
  (tenant_id,prospect_id,channel,purpose,scheduled_for,dedupe_key,draft_body,status)
  SELECT 'axiomai',p.id,'whatsapp','followup',
    GREATEST(p.follow_up_at,statement_timestamp()),
    'followup:'||p.id::text||':'||to_char(p.follow_up_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS'),
    '', 'needs_review'
  FROM public.prospects p
  WHERE p.crm_stage IN ('Seguimiento','Interesado')
    AND p.follow_up_at IS NOT NULL AND p.follow_up_at <= statement_timestamp()
    AND NOT EXISTS (SELECT 1 FROM axiomos_commercial.followup_contact_permissions c
      WHERE c.tenant_id='axiomai' AND c.prospect_id=p.id AND c.channel='whatsapp'
      AND c.purpose='followup' AND c.permission_state='opt_out'
      AND NOT EXISTS (SELECT 1 FROM axiomos_commercial.followup_contact_permissions newer
        WHERE newer.tenant_id=c.tenant_id AND newer.prospect_id=c.prospect_id
        AND newer.channel=c.channel AND newer.purpose=c.purpose
        AND (newer.recorded_at,newer.id)>(c.recorded_at,c.id)))
  ON CONFLICT (tenant_id,dedupe_key) DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.generate_followup_drafts_dryrun() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.generate_followup_drafts_dryrun() TO axiomos_commercial_writer;
-- QA: first call => 8, second => 0, approved = 0.
