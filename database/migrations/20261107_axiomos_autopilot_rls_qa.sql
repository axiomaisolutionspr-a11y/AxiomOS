-- Applied to Neon child branch br-little-wildflower-avzintxi only.
-- Existing roles and credentials are not altered. Run only in axiomos_offers_qa.
BEGIN;
DO $$ BEGIN IF current_database() <> 'axiomos_offers_qa' THEN RAISE EXCEPTION 'QA only'; END IF; END $$;
ALTER TABLE axiomos_autopilot_qa.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_autopilot_qa.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_autopilot_qa.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_autopilot_qa.audit ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t text;
BEGIN
 FOR t IN SELECT unnest(ARRAY['events','prospects','tasks','audit']) LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='axiomos_autopilot_qa' AND tablename=t AND policyname='qa_only_select') THEN
   EXECUTE format('CREATE POLICY qa_only_select ON axiomos_autopilot_qa.%I FOR SELECT USING (tenant_id = %L)',t,'axiomai-qa');
  END IF;
 END LOOP;
END $$;
COMMIT;
-- Role axiomos_autopilot_qa_panel_reader was provisioned via Neon as read_only,
-- scoped to database axiomos_offers_qa and schema axiomos_autopilot_qa.
-- Do not store role passwords in GitHub or run GRANT on neon_auth/identity/public.
