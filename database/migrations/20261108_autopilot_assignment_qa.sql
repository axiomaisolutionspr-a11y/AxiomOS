-- Prepared for QA ONLY; requires security review before any production migration.
CREATE TABLE axiomos_commercial.followup_assignments (
 tenant_id text NOT NULL DEFAULT 'axiomai',
 prospect_id bigint NOT NULL,
 assignee_user_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','cancelled')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,prospect_id),
 CONSTRAINT followup_assignment_known_tenant CHECK(tenant_id='axiomai')
);
CREATE TABLE axiomos_commercial.followup_assignment_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL,
 prospect_id bigint NOT NULL,
 assignee_user_id uuid NOT NULL,
 status text NOT NULL,
 revision integer NOT NULL,
 actor_user_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON axiomos_commercial.followup_assignments TO axiomos_commercial_reader;
GRANT SELECT ON axiomos_commercial.followup_assignments TO axiomos_commercial_writer;


-- Never grant any access to public.prospects to commercial roles.
-- No user-triggered writes until service-level RBAC, audit and revision checks pass.

-- Verified signature, one-time nonce, short expiry and audited atomic write.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE axiomos_commercial.assignment_signing_config (id integer PRIMARY KEY CHECK(id=1),secret_hex text NOT NULL CHECK(length(secret_hex)=64));
INSERT INTO axiomos_commercial.assignment_signing_config(id,secret_hex) VALUES(1,encode(gen_random_bytes(32),'hex'));
CREATE TABLE axiomos_commercial.assignment_used_nonces (nonce uuid PRIMARY KEY,used_at timestamptz NOT NULL DEFAULT now());
-- The application environment AXIOMOS_ASSIGNMENT_SIGNING_KEY must match the secret_hex
-- in assignment_signing_config, configured through an encrypted secret deployment process.
-- Do not enable assignment feature flag until a live authenticated E2E test is passed.
CREATE OR REPLACE FUNCTION axiomos_commercial.assign_followup_signed(p_prospect bigint, p_assignee uuid, p_actor uuid, p_revision integer, p_expires bigint, p_nonce uuid, p_signature text)
 RETURNS TABLE(prospect_id bigint, revision integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'axiomos_commercial', 'axiomos_identity'
AS $function$
 DECLARE v_revision integer; v_secret text; v_payload text; v_expected text;
 BEGIN
  IF p_prospect<=0 OR p_revision<0 OR p_revision>2147483646 OR length(p_signature)<>64 THEN RETURN; END IF;
  IF p_expires < extract(epoch FROM clock_timestamp())::bigint OR p_expires > extract(epoch FROM clock_timestamp())::bigint + 120 THEN RETURN; END IF;
  SELECT secret_hex INTO v_secret FROM axiomos_commercial.assignment_signing_config WHERE id=1;
  IF v_secret IS NULL THEN RETURN; END IF;
  v_payload := p_actor::text || ':' || p_prospect::text || ':' || p_assignee::text || ':' || p_revision::text || ':' || p_expires::text || ':' || p_nonce::text;
  v_expected := encode(public.hmac(convert_to(v_payload,'UTF8'),decode(v_secret,'hex'),'sha256'),'hex');
  IF v_expected <> lower(p_signature) THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND user_id=p_actor AND role='owner' AND status='active') THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND user_id=p_assignee AND role IN ('owner','operator') AND status='active') THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM axiomos_commercial.legacy_followup_review q WHERE q.prospect_id=p_prospect::text) THEN RETURN; END IF;
  INSERT INTO axiomos_commercial.assignment_used_nonces(nonce) VALUES(p_nonce) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_revision=0 THEN
   INSERT INTO axiomos_commercial.followup_assignments(tenant_id,prospect_id,assignee_user_id) VALUES('axiomai',p_prospect,p_assignee)
   ON CONFLICT(tenant_id,prospect_id) DO NOTHING RETURNING followup_assignments.revision INTO v_revision;
  ELSE
   UPDATE axiomos_commercial.followup_assignments a SET assignee_user_id=p_assignee,revision=a.revision+1,updated_at=now()
   WHERE a.tenant_id='axiomai' AND a.prospect_id=p_prospect AND a.revision=p_revision AND a.assignee_user_id IS DISTINCT FROM p_assignee AND a.status='pending'
   RETURNING a.revision INTO v_revision;
  END IF;
  IF v_revision IS NULL THEN RETURN; END IF;
  INSERT INTO axiomos_commercial.followup_assignment_audit(tenant_id,prospect_id,assignee_user_id,status,revision,actor_user_id)
   VALUES('axiomai',p_prospect,p_assignee,'pending',v_revision,p_actor);
  RETURN QUERY SELECT p_prospect,v_revision;
 END $function$
;
REVOKE ALL ON FUNCTION axiomos_commercial.assign_followup_signed(bigint,uuid,uuid,integer,bigint,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.assign_followup_signed(bigint,uuid,uuid,integer,bigint,uuid,text) TO axiomos_commercial_writer;
REVOKE INSERT,UPDATE ON axiomos_commercial.followup_assignments FROM axiomos_commercial_writer;
REVOKE INSERT ON axiomos_commercial.followup_assignment_audit FROM axiomos_commercial_writer;
-- No raw actor UUID function is created or authorized.
