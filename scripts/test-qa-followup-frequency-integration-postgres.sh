#!/usr/bin/env bash
set -euo pipefail
# Run AFTER disposable CRM, contact-history and campaign-import fixtures.
# No Meta/Telnyx connections. No real prospect or sender identifiers.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.prospects(id) VALUES (109)" >/dev/null
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO axiomos_commercial.followup_queue
(id,tenant_id,prospect_id,channel,purpose,status,scheduled_for)
VALUES (9,'axiomai',109,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z');
INSERT INTO axiomos_commercial.followup_contact_permissions
(id,tenant_id,prospect_id,channel,purpose,permission_state,evidence_source,recorded_at)
VALUES (6,'axiomai',109,'whatsapp','followup','opt_in','Synthetic CI consent evidence','2026-11-10T13:00:00Z');
SQL
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_followup_frequency_gate_v2.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(9,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_NO_FREQUENCY_SOURCE' THEN RAISE EXCEPTION 'Missing provenance was accepted: %',r; END IF;
END $$;
INSERT INTO axiomos_commercial.qa_contact_history_coverage
(tenant_id,prospect_id,channel,is_complete,verified_from,verified_through,verification_source,verified_at)
VALUES ('axiomai',109,'whatsapp',true,
 '2026-11-01T00:00:00Z','2026-11-10T16:00:00Z',
 'Synthetic end-to-end CI coverage','2026-11-10T15:59:00Z');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(9,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_NO_SUPPRESSION_SOURCE' THEN RAISE EXCEPTION 'No suppression provenance unexpectedly approved: %',r; END IF;
END $$;
INSERT INTO axiomos_commercial.qa_contact_history
(tenant_id,prospect_id,channel,purpose,source_system,source_event_key,occurred_at,event_type)
VALUES ('axiomai',109,'whatsapp','followup','verified_provider',
'QA-FREQUENCY-SYNTHETIC-1','2026-11-10T15:30:00Z','accepted');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(9,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_FREQUENCY_24H' THEN RAISE EXCEPTION '24 hour frequency not blocked: %',r; END IF;
END $$;
UPDATE axiomos_commercial.qa_contact_history SET occurred_at='2026-11-08T15:00:00Z'
WHERE source_event_key='QA-FREQUENCY-SYNTHETIC-1' AND source_system='verified_provider';
INSERT INTO axiomos_commercial.qa_contact_history
(tenant_id,prospect_id,channel,purpose,source_system,source_event_key,occurred_at,event_type)
VALUES ('axiomai',109,'whatsapp','followup','verified_provider',
'QA-FREQUENCY-SYNTHETIC-2','2026-11-07T15:00:00Z','uncertain');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(9,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_FREQUENCY_7D' THEN RAISE EXCEPTION '7-day frequency not blocked: %',r; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(1,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_NO_CONSENT' THEN RAISE EXCEPTION 'Prior opt-out bypassed: %',r; END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(9,'2026-11-11T02:00:00Z') INTO r;
 IF r<>'BLOCKED_QUIET_HOURS' THEN RAISE EXCEPTION 'Quiet hours bypassed: %',r; END IF;
 IF EXISTS (SELECT 1 FROM axiomos_commercial.qa_followup_decision_audit
     WHERE decision NOT LIKE 'BLOCKED_%') THEN RAISE EXCEPTION 'Nonblocked decision exists'; END IF;
 IF (SELECT count(*) FROM axiomos_commercial.followup_queue WHERE status='approved')<>0
 THEN RAISE EXCEPTION 'Queue approved during no-send QA'; END IF;
END $$;
SQL
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_audit_followup_transaction(bigint,timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_autopilot_e2e_worker','axiomos_commercial.qa_followup_decision_audit','INSERT')")" = "f"
echo "QA_FREQUENCY_GATED_FOLLOWUP_TRANSACTION_NO_SEND_PASS"
