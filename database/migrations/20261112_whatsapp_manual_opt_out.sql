-- Validate in an isolated QA database before release.
BEGIN;

CREATE TABLE axiomos_commercial.whatsapp_manual_opt_outs (
  tenant_id text NOT NULL CHECK (tenant_id = 'axiomai'),
  phone_key text NOT NULL CHECK (phone_key ~ '^[1-9][0-9]{10,14}$'),
  recorded_by uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id, phone_key)
);
REVOKE ALL ON axiomos_commercial.whatsapp_manual_opt_outs FROM PUBLIC,
  axiomos_commercial_reader, axiomos_commercial_writer;

CREATE FUNCTION axiomos_commercial.whatsapp_opt_out_phone_key(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
  SELECT CASE
    WHEN btrim(p_phone) !~ '^\+?[0-9 ().-]+$' THEN NULL
    WHEN digits ~ '^(787|939)[0-9]{7}$' THEN '1' || digits
    WHEN digits ~ '^[1-9][0-9]{10,14}$' THEN digits
    ELSE NULL
  END
  FROM (SELECT regexp_replace(p_phone, '[^0-9]', '', 'g') AS digits) normalized;
$$;

CREATE FUNCTION axiomos_commercial.record_whatsapp_manual_opt_out(p_prospect bigint, p_actor uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_phone_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM axiomos_identity.memberships
    WHERE tenant_id = 'axiomai' AND user_id = p_actor AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
  SELECT axiomos_commercial.whatsapp_opt_out_phone_key(caller_phone)
    INTO v_phone_key FROM public.prospects WHERE id = p_prospect;
  IF v_phone_key IS NULL THEN RETURN 'invalid_prospect'; END IF;
  INSERT INTO axiomos_commercial.whatsapp_manual_opt_outs (tenant_id, phone_key, recorded_by)
    VALUES ('axiomai', v_phone_key, p_actor)
    ON CONFLICT (tenant_id, phone_key) DO NOTHING;
  IF FOUND THEN RETURN 'recorded'; END IF;
  RETURN 'already_recorded';
END;
$$;

CREATE FUNCTION axiomos_commercial.is_whatsapp_manually_opted_out(p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM axiomos_commercial.whatsapp_manual_opt_outs
    WHERE tenant_id = 'axiomai' AND phone_key = axiomos_commercial.whatsapp_opt_out_phone_key(p_phone)
  );
$$;

CREATE FUNCTION axiomos_commercial.record_confirmed_whatsapp_manual_opt_out(
  p_prospect bigint, p_actor uuid, p_phone_suffix text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_phone_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM axiomos_identity.memberships
    WHERE tenant_id = 'axiomai' AND user_id = p_actor AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_phone_suffix IS NULL OR p_phone_suffix !~ '^[0-9]{4}$' THEN
    RETURN 'invalid_prospect';
  END IF;
  SELECT axiomos_commercial.whatsapp_opt_out_phone_key(caller_phone)
    INTO v_phone_key FROM public.prospects WHERE id = p_prospect FOR SHARE;
  IF right(v_phone_key, 4) IS DISTINCT FROM p_phone_suffix THEN
    RETURN 'invalid_prospect';
  END IF;
  RETURN axiomos_commercial.record_whatsapp_manual_opt_out(p_prospect, p_actor);
END;
$$;

REVOKE ALL ON FUNCTION axiomos_commercial.whatsapp_opt_out_phone_key(text),
  axiomos_commercial.record_whatsapp_manual_opt_out(bigint,uuid),
  axiomos_commercial.record_confirmed_whatsapp_manual_opt_out(bigint,uuid,text),
  axiomos_commercial.is_whatsapp_manually_opted_out(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.whatsapp_opt_out_phone_key(text)
  TO axiomos_commercial_reader, axiomos_commercial_writer;
GRANT EXECUTE ON FUNCTION axiomos_commercial.record_confirmed_whatsapp_manual_opt_out(bigint,uuid,text)
  TO axiomos_commercial_writer;

CREATE OR REPLACE VIEW axiomos_commercial.followup_eligibility WITH (security_barrier=true) AS
 SELECT q.tenant_id, q.id::text AS item_id,
 CASE WHEN preference.state = 'opt_out' THEN 'blocked_opt_out'
 WHEN preference.state = 'opt_in' THEN 'consent_recorded_requires_review'
 ELSE 'blocked_no_consent' END AS eligibility,
 preference.state AS permission_state
 FROM axiomos_commercial.followup_queue q
 JOIN public.prospects p ON p.id = q.prospect_id
 LEFT JOIN axiomos_commercial.whatsapp_manual_opt_outs manual ON manual.tenant_id=q.tenant_id
   AND q.channel='whatsapp' AND q.purpose='followup'
   AND manual.phone_key=axiomos_commercial.whatsapp_opt_out_phone_key(p.caller_phone)
 LEFT JOIN LATERAL (SELECT permission_state FROM axiomos_commercial.followup_contact_permissions c
 WHERE c.tenant_id=q.tenant_id AND c.prospect_id=q.prospect_id AND c.channel=q.channel AND c.purpose=q.purpose
 ORDER BY recorded_at DESC,id DESC LIMIT 1) latest ON true
 CROSS JOIN LATERAL (SELECT CASE
   WHEN manual.phone_key IS NOT NULL THEN 'opt_out'
   ELSE COALESCE(latest.permission_state,'unknown') END AS state) preference
 WHERE q.tenant_id='axiomai';

CREATE OR REPLACE FUNCTION axiomos_commercial.generate_followup_drafts_dryrun()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,public AS $$
DECLARE inserted integer;
BEGIN
  IF current_user <> 'neondb_owner' AND session_user <> 'axiomos_commercial_writer' THEN
    RAISE EXCEPTION 'Unauthorized database role' USING ERRCODE='42501';
  END IF;
  INSERT INTO axiomos_commercial.followup_queue
    (tenant_id,prospect_id,channel,purpose,scheduled_for,dedupe_key,draft_body,status)
  SELECT 'axiomai',p.id,'whatsapp','followup',GREATEST(p.follow_up_at,statement_timestamp()),
    'followup:'||p.id::text||':'||to_char(p.follow_up_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS'),
    '', 'needs_review'
  FROM public.prospects p
  WHERE p.crm_stage IN ('Seguimiento','Interesado')
    AND p.follow_up_at IS NOT NULL AND p.follow_up_at <= statement_timestamp()
    AND NOT axiomos_commercial.is_whatsapp_manually_opted_out(p.caller_phone)
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

COMMIT;
