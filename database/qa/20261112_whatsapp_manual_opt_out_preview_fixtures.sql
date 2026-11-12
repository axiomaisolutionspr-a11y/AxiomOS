-- Synthetic CRM data for the isolated Autopilot Preview.
BEGIN;

DO $guard$
BEGIN
  IF current_database() <> 'axiomos_offers_qa' THEN
    RAISE EXCEPTION 'Manual WhatsApp opt-out fixtures require axiomos_offers_qa';
  END IF;
END
$guard$;

CREATE SCHEMA axiomos_manual_optout_preview;
REVOKE ALL ON SCHEMA axiomos_manual_optout_preview FROM PUBLIC;
GRANT USAGE ON SCHEMA axiomos_manual_optout_preview TO axiomos_offers_qa_reader, axiomos_autopilot_qa_offer_writer;

CREATE TABLE axiomos_manual_optout_preview.prospects (
  id bigint PRIMARY KEY,
  caller_phone text NOT NULL,
  caller_name text NOT NULL,
  caller_company text NOT NULL DEFAULT '',
  crm_notes text NOT NULL DEFAULT '',
  crm_stage text NOT NULL DEFAULT 'Seguimiento'
);
CREATE TABLE axiomos_manual_optout_preview.whatsapp_messages (
  phone text NOT NULL, role text NOT NULL, message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE TABLE axiomos_manual_optout_preview.followup_queue (
  id bigint PRIMARY KEY, tenant_id text NOT NULL DEFAULT 'axiomai',
  prospect_id bigint NOT NULL REFERENCES axiomos_manual_optout_preview.prospects(id),
  channel text NOT NULL, purpose text NOT NULL
);
CREATE TABLE axiomos_manual_optout_preview.followup_contact_permissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'axiomai',
  prospect_id bigint NOT NULL REFERENCES axiomos_manual_optout_preview.prospects(id),
  channel text NOT NULL, purpose text NOT NULL, permission_state text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
REVOKE ALL ON ALL TABLES IN SCHEMA axiomos_manual_optout_preview
  FROM PUBLIC, axiomos_offers_qa_reader, axiomos_autopilot_qa_offer_writer;

CREATE TABLE axiomos_manual_optout_preview.whatsapp_manual_opt_outs (
  tenant_id text NOT NULL CHECK (tenant_id = 'axiomai'),
  phone_key text NOT NULL CHECK (phone_key ~ '^[1-9][0-9]{10,14}$'),
  recorded_by uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id, phone_key)
);
REVOKE ALL ON axiomos_manual_optout_preview.whatsapp_manual_opt_outs FROM PUBLIC,
  axiomos_offers_qa_reader, axiomos_autopilot_qa_offer_writer;

CREATE FUNCTION axiomos_manual_optout_preview.whatsapp_opt_out_phone_key(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
  SELECT CASE
    WHEN btrim(p_phone) !~ '^\+?[0-9 ().-]+$' THEN NULL
    WHEN digits ~ '^(787|939)[0-9]{7}$' THEN '1' || digits
    WHEN digits ~ '^[1-9][0-9]{10,14}$' THEN digits
    ELSE NULL
  END
  FROM (SELECT regexp_replace(p_phone, '[^0-9]', '', 'g') AS digits) normalized;
$$;

CREATE FUNCTION axiomos_manual_optout_preview.record_whatsapp_manual_opt_out(p_prospect bigint, p_actor uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_phone_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM axiomos_identity.memberships
    WHERE tenant_id = 'axiomai' AND user_id = p_actor AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
  SELECT axiomos_manual_optout_preview.whatsapp_opt_out_phone_key(caller_phone)
    INTO v_phone_key FROM axiomos_manual_optout_preview.prospects WHERE id = p_prospect;
  IF v_phone_key IS NULL THEN RETURN 'invalid_prospect'; END IF;
  INSERT INTO axiomos_manual_optout_preview.whatsapp_manual_opt_outs (tenant_id, phone_key, recorded_by)
    VALUES ('axiomai', v_phone_key, p_actor)
    ON CONFLICT (tenant_id, phone_key) DO NOTHING;
  IF FOUND THEN RETURN 'recorded'; END IF;
  RETURN 'already_recorded';
END;
$$;

CREATE FUNCTION axiomos_manual_optout_preview.is_whatsapp_manually_opted_out(p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM axiomos_manual_optout_preview.whatsapp_manual_opt_outs
    WHERE tenant_id = 'axiomai' AND phone_key = axiomos_manual_optout_preview.whatsapp_opt_out_phone_key(p_phone)
  );
$$;

CREATE OR REPLACE VIEW axiomos_manual_optout_preview.followup_eligibility WITH (security_barrier=true) AS
 SELECT q.tenant_id, q.id::text AS item_id,
 CASE WHEN preference.state = 'opt_out' THEN 'blocked_opt_out'
 WHEN preference.state = 'opt_in' THEN 'consent_recorded_requires_review'
 ELSE 'blocked_no_consent' END AS eligibility,
 preference.state AS permission_state
 FROM axiomos_manual_optout_preview.followup_queue q
 JOIN axiomos_manual_optout_preview.prospects p ON p.id = q.prospect_id
 LEFT JOIN axiomos_manual_optout_preview.whatsapp_manual_opt_outs manual ON manual.tenant_id=q.tenant_id
   AND q.channel='whatsapp' AND q.purpose='followup'
   AND manual.phone_key=axiomos_manual_optout_preview.whatsapp_opt_out_phone_key(p.caller_phone)
 LEFT JOIN LATERAL (SELECT permission_state FROM axiomos_manual_optout_preview.followup_contact_permissions c
 WHERE c.tenant_id=q.tenant_id AND c.prospect_id=q.prospect_id AND c.channel=q.channel AND c.purpose=q.purpose
 ORDER BY recorded_at DESC,id DESC LIMIT 1) latest ON true
 CROSS JOIN LATERAL (SELECT CASE
   WHEN manual.phone_key IS NOT NULL THEN 'opt_out'
   ELSE COALESCE(latest.permission_state,'unknown') END AS state) preference
 WHERE q.tenant_id='axiomai';

INSERT INTO axiomos_manual_optout_preview.prospects (id, caller_phone, caller_name)
VALUES (91001, '(787) 555-0121', 'Contacto ficticio A'),
       (91002, '+1 787-555-0121', 'Contacto ficticio B'),
       (91003, '939-555-0122', 'Contacto ficticio C');
INSERT INTO axiomos_manual_optout_preview.whatsapp_messages (phone, role, message)
VALUES ('17875550121', 'user', 'Hola'), ('19395550122', 'user', 'Hola');
INSERT INTO axiomos_manual_optout_preview.followup_queue (id, prospect_id, channel, purpose)
SELECT id, id, 'whatsapp', 'followup' FROM axiomos_manual_optout_preview.prospects;
INSERT INTO axiomos_manual_optout_preview.followup_contact_permissions (prospect_id, channel, purpose, permission_state)
SELECT id, 'whatsapp', 'followup', 'opt_in' FROM axiomos_manual_optout_preview.prospects;

CREATE FUNCTION axiomos_manual_optout_preview.fixture_status()
RETURNS TABLE(prospect text, campaign_eligible boolean, followup_blocked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  WITH campaign AS (

    WITH inbound AS (
      SELECT
        right(regexp_replace(phone, '\D', '', 'g'), 10) AS phone_key,
        count(*) FILTER (WHERE role = 'user')::int AS inbound_count,
        max(created_at) FILTER (WHERE role = 'user') AS last_inbound_at,
        bool_or(
          role = 'user'
          AND lower(trim(message)) ~
            '^(no|stop|parar|baja|cancelar|no me escribas|no deseo (mas|más) (mensajes|promociones))$'
        ) AS opted_out
      FROM axiomos_manual_optout_preview.whatsapp_messages
      GROUP BY 1
    )
    SELECT
      p.id::text AS id,
      coalesce(
        nullif(substring(coalesce(p.crm_notes, '') from
          'Nombre de perfil \(sin verificar\): ([^\n\r]+)'), ''),
        nullif(p.caller_name, 'Contacto de WhatsApp'),
        'Contacto'
      ) AS name,
      coalesce(p.caller_company, '') AS company,
      coalesce(p.caller_phone, '') AS phone,
      right(regexp_replace(coalesce(p.caller_phone, ''), '\D', '', 'g'), 10) AS phone_key,
      p.crm_stage AS stage,
      i.inbound_count,
      i.last_inbound_at
    FROM axiomos_manual_optout_preview.prospects p
    JOIN inbound i
      ON i.phone_key =
        right(regexp_replace(coalesce(p.caller_phone, ''), '\D', '', 'g'), 10)
    WHERE p.crm_stage NOT IN ('Vendido', 'Perdido')
      AND i.inbound_count > 0
      AND NOT i.opted_out
      AND NOT axiomos_manual_optout_preview.is_whatsapp_manually_opted_out(i.phone_key)
      AND i.phone_key ~ '^(787|939)'
      AND lower(coalesce(p.caller_company, '')) <> 'axiomai solutions'
      AND lower(concat_ws(' ', p.caller_name, p.caller_company, p.crm_notes))
        !~ '(^|[^[:alnum:]])(prueba|qa|test)([^[:alnum:]]|$)'
      AND lower(coalesce(p.crm_notes, '')) NOT LIKE '%favor ignorar%'
    ORDER BY i.last_inbound_at DESC
    LIMIT 10
  )
  SELECT p.id::text, c.id IS NOT NULL, e.eligibility = 'blocked_opt_out'
  FROM axiomos_manual_optout_preview.prospects p
  LEFT JOIN campaign c ON c.id = p.id::text
  JOIN axiomos_manual_optout_preview.followup_eligibility e ON e.item_id = p.id::text
  ORDER BY p.id;
$$;

REVOKE ALL ON FUNCTION axiomos_manual_optout_preview.whatsapp_opt_out_phone_key(text),
  axiomos_manual_optout_preview.record_whatsapp_manual_opt_out(bigint,uuid),
  axiomos_manual_optout_preview.is_whatsapp_manually_opted_out(text),
  axiomos_manual_optout_preview.fixture_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_manual_optout_preview.record_whatsapp_manual_opt_out(bigint,uuid)
  TO axiomos_autopilot_qa_offer_writer;
GRANT EXECUTE ON FUNCTION axiomos_manual_optout_preview.fixture_status() TO axiomos_offers_qa_reader;

COMMIT;
