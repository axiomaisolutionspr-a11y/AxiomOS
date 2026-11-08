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
GRANT SELECT,INSERT,UPDATE ON axiomos_commercial.followup_assignments TO axiomos_commercial_writer;
GRANT INSERT ON axiomos_commercial.followup_assignment_audit TO axiomos_commercial_writer;
GRANT USAGE ON SEQUENCE axiomos_commercial.followup_assignment_audit_id_seq TO axiomos_commercial_writer;
-- Never grant any access to public.prospects to commercial roles.
-- No user-triggered writes until service-level RBAC, audit and revision checks pass.
