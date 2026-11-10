#!/usr/bin/env bash
set -euo pipefail
# Isolated GitHub CI PostgreSQL, no customer data, provider or send.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE public.prospects(id bigint PRIMARY KEY);
INSERT INTO public.prospects(id) VALUES (101),(102);
GRANT REFERENCES,SELECT ON public.prospects TO neondb_owner;
SQL
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_contact_history_failclosed.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE x record;
BEGIN
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(101,'whatsapp','2026-11-10T16:00:00Z');
 IF x.coverage_valid IS DISTINCT FROM false OR x.contacts_last_7d IS NOT NULL THEN
  RAISE EXCEPTION 'Missing history mistakenly passed'; END IF;
END $$;
INSERT INTO axiomos_commercial.qa_contact_history
(tenant_id,prospect_id,channel,purpose,source_system,source_event_key,occurred_at,event_type)
VALUES('axiomai',101,'whatsapp','followup','verified_provider','QA-HIST-001','2026-11-10T15:00:00Z','accepted');
INSERT INTO axiomos_commercial.qa_contact_history_coverage
(tenant_id,prospect_id,channel,is_complete,verified_from,verified_through,verification_source,verified_at)
VALUES('axiomai',101,'whatsapp',false,'2026-11-01T00:00:00Z','2026-11-10T16:00:00Z','Synthetic provider audit','2026-11-10T15:59:00Z');
DO $$
DECLARE x record;
BEGIN
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(101,'whatsapp','2026-11-10T16:00:00Z');
 IF x.coverage_valid IS DISTINCT FROM false THEN RAISE EXCEPTION 'Incomplete history passed'; END IF;
END $$;
UPDATE axiomos_commercial.qa_contact_history_coverage SET is_complete=true
WHERE prospect_id=101 AND channel='whatsapp';
DO $$
DECLARE x record;
BEGIN
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(101,'whatsapp','2026-11-10T16:00:00Z');
 IF NOT x.coverage_valid OR x.contacts_last_7d<>1 OR x.contacts_last_24h<>1
 THEN RAISE EXCEPTION 'Valid synthetic history rejected'; END IF;
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(102,'whatsapp','2026-11-10T16:00:00Z');
 IF x.coverage_valid IS DISTINCT FROM false THEN RAISE EXCEPTION 'Cross prospect history allowed'; END IF;
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(101,'sms','2026-11-10T16:00:00Z');
 IF x.coverage_valid IS DISTINCT FROM false THEN RAISE EXCEPTION 'Cross channel history allowed'; END IF;
 SELECT * INTO x FROM axiomos_commercial.qa_contact_frequency_evidence(101,'whatsapp','2026-11-10T18:00:00Z');
 IF x.coverage_valid IS DISTINCT FROM false THEN RAISE EXCEPTION 'Stale history allowed'; END IF;
END $$;
SQL
# Must reject duplicate source event keys, even if a different purpose or prospect is supplied
if psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO axiomos_commercial.qa_contact_history (prospect_id,channel,purpose,source_system,source_event_key,occurred_at,event_type) VALUES (102,'whatsapp','followup','verified_provider','QA-HIST-001','2026-11-10T15:00:00Z','sent')" >/dev/null 2>&1; then
 echo "Duplicate event accepted" >&2;exit 1
fi
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_contact_frequency_evidence(bigint,text,timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_commercial_reader','axiomos_commercial.qa_contact_history','SELECT')")" = "f"
echo "QA_CONTACT_HISTORY_PROVENANCE_NO_SEND_PASS"
