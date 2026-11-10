#!/usr/bin/env bash
set -euo pipefail
# Full QA transaction stack already bootstrapped by preceding CI steps.
# All contacts are invented. No provider adapters or external calls.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_worker_cycle_no_send.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE one record; again record; bad record; before_count integer;
BEGIN
 SELECT count(*) INTO before_count FROM axiomos_commercial.qa_followup_decision_audit;
 SELECT * INTO one FROM axiomos_commercial.qa_run_worker_audit(
 'QA-RUN-TEST-NOV10-0001','2026-11-10T16:00:00Z',100);
 IF one.result<>'AUDITED_NO_SEND' OR one.reviewed<8 OR one.reviewed<>one.blocked
 THEN RAISE EXCEPTION 'worker did not fail closed: %, %, %',one.result,one.reviewed,one.blocked; END IF;
 SELECT * INTO again FROM axiomos_commercial.qa_run_worker_audit(
 'QA-RUN-TEST-NOV10-0001','2026-11-10T16:00:00Z',100);
 IF again.result<>'DUPLICATE_NO_SEND' OR again.reviewed<>one.reviewed
 THEN RAISE EXCEPTION 'duplicate cycle was not idempotent';END IF;
 IF (SELECT count(*) FROM axiomos_commercial.qa_followup_decision_audit)
     <>before_count+one.reviewed
 THEN RAISE EXCEPTION 'duplicate cycle appended decisions';END IF;
 SELECT * INTO bad FROM axiomos_commercial.qa_run_worker_audit(
 'BAD-KEY','2026-11-10T16:00:00Z',100);
 IF bad.result<>'INVALID_REQUEST' THEN RAISE EXCEPTION 'bad key permitted';END IF;
 SELECT * INTO bad FROM axiomos_commercial.qa_run_worker_audit(
 'QA-RUN-TEST-NOV10-0002','2026-11-10T16:00:00Z',101);
 IF bad.result<>'INVALID_REQUEST' THEN RAISE EXCEPTION 'unbounded cycle permitted';END IF;
 IF EXISTS(SELECT 1 FROM axiomos_commercial.qa_worker_audit_runs
   WHERE reviewed<>blocked OR mode<>'audit_no_send')
 THEN RAISE EXCEPTION 'worker created a nonblocked run';END IF;
 IF EXISTS(SELECT 1 FROM axiomos_commercial.followup_queue
   WHERE tenant_id='axiomai' AND status NOT IN ('needs_review','blocked'))
 THEN RAISE EXCEPTION 'worker changed CRM followup status';END IF;
 IF (SELECT count(*) FROM axiomos_commercial.qa_worker_audit_runs)<>1
 THEN RAISE EXCEPTION 'unexpected number of worker executions';END IF;
END $$;
SQL
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_writer','axiomos_commercial.qa_run_worker_audit(text,timestamptz,integer)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_autopilot_e2e_worker','axiomos_commercial.qa_run_worker_audit(text,timestamptz,integer)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_commercial_reader','axiomos_commercial.qa_worker_audit_runs','SELECT')")" = "f"
echo "QA_TRANSACTIONAL_WORKER_CYCLE_NO_SEND_PASS"
