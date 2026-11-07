-- QA only: apply to the dedicated database on the identity child branch.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$ BEGIN
  IF current_database() <> 'axiomos_offers_qa' THEN
    RAISE EXCEPTION 'Identity QA requires axiomos_offers_qa';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS axiomos_identity;
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
COMMIT;
