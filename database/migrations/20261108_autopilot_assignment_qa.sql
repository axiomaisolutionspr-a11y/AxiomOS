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

-- Ownership verified in the database; changes and audit are in one transaction.
CREATE OR REPLACE FUNCTION axiomos_commercial.assign_followup(p_prospect bigint,p_assignee uuid,p_actor uuid,p_revision integer)
RETURNS TABLE (prospect_id bigint, revision integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,axiomos_commercial,axiomos_identity AS $$
DECLARE v_revision integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND user_id=p_actor AND role='owner' AND status='active') THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM axiomos_identity.memberships WHERE tenant_id='axiomai' AND user_id=p_assignee AND role IN ('owner','operator') AND status='active') THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM axiomos_commercial.legacy_followup_review q WHERE q.prospect_id=p_prospect::text) THEN RETURN; END IF;
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
END $$;
REVOKE ALL ON FUNCTION axiomos_commercial.assign_followup(bigint,uuid,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION axiomos_commercial.assign_followup(bigint,uuid,uuid,integer) TO axiomos_commercial_writer;
REVOKE INSERT,UPDATE ON axiomos_commercial.followup_assignments FROM axiomos_commercial_writer;
REVOKE INSERT ON axiomos_commercial.followup_assignment_audit FROM axiomos_commercial_writer;
-- Feature flag must remain off until E2E identity / role / session testing is complete.
