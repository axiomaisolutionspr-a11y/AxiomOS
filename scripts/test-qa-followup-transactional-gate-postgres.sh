#!/usr/bin/env bash
set -euo pipefail
# Synthetic QA fixtures in disposable CI postgres; no providers or real CRM rows.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE axiomos_commercial.followup_queue (
 id bigint PRIMARY KEY,tenant_id text NOT NULL,prospect_id bigint NOT NULL,
 channel text NOT NULL,purpose text NOT NULL,status text NOT NULL,
 scheduled_for timestamptz NOT NULL
);
CREATE TABLE axiomos_commercial.followup_contact_permissions (
 id bigint PRIMARY KEY,tenant_id text NOT NULL,prospect_id bigint NOT NULL,
 channel text NOT NULL,purpose text NOT NULL,permission_state text NOT NULL,
 evidence_source text NOT NULL,recorded_at timestamptz NOT NULL
);
CREATE TABLE axiomos_commercial.followup_review_decisions (
 id bigint PRIMARY KEY,tenant_id text NOT NULL,queue_id bigint NOT NULL,
 decision text NOT NULL
);
INSERT INTO axiomos_commercial.followup_queue VALUES
 (1,'axiomai',101,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (2,'axiomai',102,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (3,'axiomai',103,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (4,'axiomai',104,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (5,'axiomai',105,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (6,'axiomai',106,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
 (7,'axiomai',107,'whatsapp','followup','blocked','2026-11-10T14:00:00Z'),
 (8,'other',108,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z');
INSERT INTO axiomos_commercial.followup_contact_permissions VALUES
 (1,'axiomai',101,'whatsapp','followup','opt_out','synthetic QA optout','2026-11-10T13:00:00Z'),
 (2,'axiomai',102,'whatsapp','followup','opt_in','synthetic QA consent','2026-11-10T13:00:00Z'),
 (3,'axiomai',104,'whatsapp','followup','opt_in','synthetic QA consent','2026-11-10T13:00:00Z'),
 (4,'axiomai',105,'whatsapp','followup','opt_in','synthetic QA consent','2026-11-10T13:00:00Z'),
 (5,'axiomai',106,'whatsapp','followup','opt_in','synthetic QA consent','2026-08-01T13:00:00Z');
INSERT INTO axiomos_commercial.followup_review_decisions VALUES
 (1,'axiomai',4,'blocked');
SQL
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_followup_transactional_gate.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE actual text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(1,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_NO_CONSENT' THEN RAISE EXCEPTION 'optout %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(2,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_NO_FREQUENCY_SOURCE' THEN RAISE EXCEPTION 'missing history %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(3,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_NO_CONSENT' THEN RAISE EXCEPTION 'missing consent %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(4,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_REVIEW' THEN RAISE EXCEPTION 'blocked review %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(5,'2026-11-10T01:00:00Z') INTO actual;
 IF actual<>'BLOCKED_QUIET_HOURS' THEN RAISE EXCEPTION 'quiet hours %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(6,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_INVALID_EVIDENCE' THEN RAISE EXCEPTION 'expired consent %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(7,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'BLOCKED_STATUS' THEN RAISE EXCEPTION 'blocked status %',actual; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(8,'2026-11-10T16:00:00Z') INTO actual;
 IF actual<>'QUEUE_NOT_FOUND' THEN RAISE EXCEPTION 'tenant leak %',actual; END IF;
 IF (SELECT count(*) FROM axiomos_commercial.qa_followup_decision_audit)<>7 THEN RAISE EXCEPTION 'audit count'; END IF;
 IF (SELECT count(*) FROM axiomos_commercial.followup_queue WHERE status='needs_review')<>7 THEN RAISE EXCEPTION 'queue mutated'; END IF;
END $$;
SQL
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_writer','axiomos_commercial.qa_audit_followup_transaction(bigint,timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_autopilot_e2e_worker','axiomos_commercial.qa_audit_followup_transaction(bigint,timestamptz)','EXECUTE')")" = "f"
echo "QA_FOLLOWUP_TRANSACTIONAL_AUDIT_NO_SEND_PASS"
