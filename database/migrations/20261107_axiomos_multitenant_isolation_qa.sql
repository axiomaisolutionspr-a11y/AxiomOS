-- Isolated proof of tenant isolation. Apply ONLY to a child branch of the
-- synthetic storage QA branch, database axiomos_offers_qa.
-- No production tables, users, connections, or permissions are changed.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$ BEGIN
  IF current_database() <> 'axiomos_offers_qa' THEN
    RAISE EXCEPTION 'QA database required';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='axiomos_mtqa_a_reader') THEN
    CREATE ROLE axiomos_mtqa_a_reader NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='axiomos_mtqa_b_reader') THEN
    CREATE ROLE axiomos_mtqa_b_reader NOLOGIN;
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS axiomos_multitenant_qa;
REVOKE ALL ON SCHEMA axiomos_multitenant_qa FROM PUBLIC;
CREATE TABLE IF NOT EXISTS axiomos_multitenant_qa.prospects (
  tenant_id text NOT NULL CHECK (tenant_id IN ('qa-tenant-a','qa-tenant-b')),
  contact_key text NOT NULL CHECK (contact_key ~ '^qa:[a-zA-Z0-9_-]{4,100}$'),
  PRIMARY KEY (tenant_id, contact_key)
);
REVOKE ALL ON axiomos_multitenant_qa.prospects FROM PUBLIC;
-- Seed before FORCE: the owner is intentionally subject to RLS afterward.
INSERT INTO axiomos_multitenant_qa.prospects VALUES
  ('qa-tenant-a','qa:tenant_a_demo'), ('qa-tenant-b','qa:tenant_b_demo')
ON CONFLICT DO NOTHING;
ALTER TABLE axiomos_multitenant_qa.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_multitenant_qa.prospects FORCE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA axiomos_multitenant_qa TO axiomos_mtqa_a_reader, axiomos_mtqa_b_reader;
GRANT SELECT ON axiomos_multitenant_qa.prospects TO axiomos_mtqa_a_reader, axiomos_mtqa_b_reader;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='axiomos_multitenant_qa'
    AND tablename='prospects' AND policyname='tenant_a_select') THEN
    CREATE POLICY tenant_a_select ON axiomos_multitenant_qa.prospects
      FOR SELECT TO axiomos_mtqa_a_reader USING (tenant_id='qa-tenant-a');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='axiomos_multitenant_qa'
    AND tablename='prospects' AND policyname='tenant_b_select') THEN
    CREATE POLICY tenant_b_select ON axiomos_multitenant_qa.prospects
      FOR SELECT TO axiomos_mtqa_b_reader USING (tenant_id='qa-tenant-b');
  END IF;
END $$;
-- This grant is for controlled SET ROLE verification by the branch owner.
-- Neither role has LOGIN or write privileges.
GRANT axiomos_mtqa_a_reader, axiomos_mtqa_b_reader TO neondb_owner;
COMMIT;
