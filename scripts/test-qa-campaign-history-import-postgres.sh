#!/usr/bin/env bash
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE public.whatsapp_campaign_sends (
 id bigint PRIMARY KEY,prospect_id bigint,status text,provider_message_id text,
 sent_at timestamptz
);
INSERT INTO public.whatsapp_campaign_sends VALUES
 (1,101,'accepted','wamid.qa-fixture-accepted-0001','2026-11-10T15:00:00Z'),
 (2,102,'accepted','wamid.qa-fixture-accepted-0002','2026-11-10T15:10:00Z'),
 (3,101,'failed','wamid.qa-fixture-failed-0003','2026-11-10T15:20:00Z');
GRANT SELECT ON public.whatsapp_campaign_sends,public.prospects TO neondb_owner;
SQL
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_reconcile_campaign_contact_attempts.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_reconcile_campaign_contact_attempts.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
 IF (SELECT count(*) FROM axiomos_commercial.qa_contact_history WHERE source_system='reconciled_campaign')<>2
 THEN RAISE EXCEPTION 'Campaign import duplicated or omitted attempts';END IF;
 IF EXISTS(SELECT 1 FROM axiomos_commercial.qa_contact_history WHERE
    source_system='reconciled_campaign' AND (purpose<>'marketing' OR event_type<>'accepted'))
 THEN RAISE EXCEPTION 'Campaign acceptance misclassified as delivery'; END IF;
 IF (SELECT count(*) FROM axiomos_commercial.qa_contact_history_coverage)<>1
 THEN RAISE EXCEPTION 'Coverage was unexpectedly changed';END IF;
 IF EXISTS(SELECT 1 FROM axiomos_commercial.qa_contact_history_coverage
    WHERE prospect_id IN (101,102) AND is_complete IS TRUE AND channel='whatsapp')
 THEN RAISE EXCEPTION 'Campaign import fabricated complete coverage';END IF;
END $$;
SQL
echo "QA_CAMPAIGN_HISTORY_IDEMPOTENT_NO_SEND_PASS"
