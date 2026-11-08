-- Production candidate for internal AxiomAI tenant. Test on a child branch first.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$ BEGIN
  IF current_database() <> 'neondb' THEN
    RAISE EXCEPTION 'Identity QA requires neondb';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS axiomos_identity;
REVOKE ALL ON SCHEMA axiomos_identity FROM PUBLIC;
CREATE TABLE IF NOT EXISTS axiomos_identity.memberships (
  tenant_id TEXT NOT NULL CHECK (tenant_id = 'axiomai'),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS memberships_user_active_idx
  ON axiomos_identity.memberships (user_id, tenant_id) WHERE status = 'active';
REVOKE ALL ON axiomos_identity.memberships FROM PUBLIC;
COMMIT;
