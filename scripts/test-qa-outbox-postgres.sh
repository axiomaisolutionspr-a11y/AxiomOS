#!/usr/bin/env bash
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE neondb_owner LOGIN PASSWORD 'qa-only-test';
CREATE ROLE axiomos_commercial_reader LOGIN PASSWORD 'qa-only-test';
CREATE ROLE axiomos_commercial_writer LOGIN PASSWORD 'qa-only-test';
CREATE SCHEMA axiomos_commercial AUTHORIZATION neondb_owner;
GRANT USAGE ON SCHEMA axiomos_commercial TO axiomos_commercial_reader,axiomos_commercial_writer;
SQL
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261109_qa_delivery_outbox_no_provider.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO axiomos_commercial.qa_delivery_outbox (test_key,channel,authorized,opt_in,suppressed,due_at) VALUES
('QA-CI-ELIGIBLE','sms',true,true,false,'2026-11-09T15:00:00Z'),
('QA-CI-OPTOUT','sms',true,true,true,'2026-11-09T15:00:00Z'),
('QA-CI-NOCONSENT','sms',true,false,false,'2026-11-09T15:00:00Z'),
('QA-CI-NOOWNER','sms',false,true,false,'2026-11-09T15:00:00Z'),
('QA-CI-FUTURE','sms',true,true,false,'2026-11-10T15:00:00Z');
DO $$
BEGIN
  IF (SELECT count(*) FROM axiomos_commercial.qa_claim_next_delivery('2026-11-10T02:00:00Z')) <> 0 THEN
    RAISE EXCEPTION 'Quiet-hour claim permitted';
  END IF;
END $$;
SQL
# Two independent PostgreSQL processes compete for the same synthetic job.
a="$(mktemp)" ; b="$(mktemp)"
psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT test_key FROM axiomos_commercial.qa_claim_next_delivery('2026-11-09T16:00:00Z')" > "$a" &
p1=$!
psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT test_key FROM axiomos_commercial.qa_claim_next_delivery('2026-11-09T16:00:00Z')" > "$b" &
p2=$!
wait "$p1"; wait "$p2"
claims="$(cat "$a" "$b" | grep -c '^QA-CI-ELIGIBLE$' || true)"
test "$claims" -eq 1
test "$(psql -X -A -t -c "SELECT count(*) FROM axiomos_commercial.qa_delivery_outbox WHERE status='claimed' AND attempts=1")" = "1"
test "$(psql -X -A -t -c "SELECT count(*) FROM axiomos_commercial.qa_delivery_outbox WHERE status='pending' AND attempts=0")" = "4"
id="$(psql -X -A -t -c "SELECT id FROM axiomos_commercial.qa_delivery_outbox WHERE test_key='QA-CI-ELIGIBLE'")"
test "$(psql -X -A -t -c "SELECT axiomos_commercial.qa_record_delivery_outcome($id,'uncertain')")" = "RECORDED_NO_PROVIDER"
test "$(psql -X -A -t -c "SELECT axiomos_commercial.qa_record_delivery_outcome($id,'accepted')")" = "REJECTED_NOT_CLAIMED"
test "$(psql -X -A -t -c "SELECT count(*) FROM axiomos_commercial.qa_claim_next_delivery('2026-11-09T16:00:00Z')")" = "0"
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_claim_next_delivery(timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_writer','axiomos_commercial.qa_claim_next_delivery(timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_commercial_reader','axiomos_commercial.qa_delivery_outbox','SELECT')")" = "f"
echo "QA_OUTBOX_ATOMIC_NO_SEND_PASS"
