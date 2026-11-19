#!/usr/bin/env bash
set -euo pipefail
# Disposable PostgreSQL after QA transactional/frequency fixture steps.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.prospects(id) VALUES (110),(111)" >/dev/null
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_followup_suppression_gate_v3.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO axiomos_commercial.followup_queue
(id,tenant_id,prospect_id,channel,purpose,status,scheduled_for)
VALUES (10,'axiomai',110,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z'),
       (11,'axiomai',111,'whatsapp','followup','needs_review','2026-11-10T14:00:00Z');
INSERT INTO axiomos_commercial.followup_contact_permissions
(id,tenant_id,prospect_id,channel,purpose,permission_state,evidence_source,recorded_at)
VALUES (7,'axiomai',110,'whatsapp','followup','opt_in','Synthetic QA verified consent','2026-11-10T13:00:00Z'),
       (8,'axiomai',111,'whatsapp','followup','opt_in','Synthetic QA verified consent','2026-11-10T13:00:00Z');
INSERT INTO axiomos_commercial.qa_contact_history_coverage
(prospect_id,channel,is_complete,verified_from,verified_through,verified_at,verification_source)
VALUES (110,'whatsapp',true,'2026-11-01T00:00:00Z',
 '2026-11-10T16:00:00Z','2026-11-10T15:59:00Z','Synthetic complete provider history'),
 (111,'whatsapp',true,'2026-11-01T00:00:00Z',
 '2026-11-10T16:00:00Z','2026-11-10T15:59:00Z','Synthetic complete provider history');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(10,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_NO_SUPPRESSION_SOURCE' THEN RAISE EXCEPTION 'Unknown suppression accepted: %',r;END IF;
END $$;
INSERT INTO axiomos_commercial.qa_suppression_events
(prospect_id,channel,event_type,source_system,source_event_key,occurred_at)
VALUES (110,'global','opt_out','provider_verified','QA-OPT-OUT-110','2026-11-10T15:00:00Z');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(10,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_SUPPRESSED' THEN RAISE EXCEPTION 'Global optout ignored: %',r;END IF;
END $$;
INSERT INTO axiomos_commercial.qa_suppression_coverage
(prospect_id,channel,complete,verified_through,verified_at,source_evidence)
VALUES (111,'whatsapp',true,'2026-11-10T16:00:00Z',
'2026-11-10T15:59:00Z','Synthetic provider suppression audit');
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_audit_followup_transaction(111,'2026-11-10T16:00:00Z') INTO r;
 -- Nonexistent queue is never accepted.
 IF r<>'QUEUE_NOT_FOUND' THEN RAISE EXCEPTION 'Unknown queue: %',r;END IF;
 SELECT axiomos_commercial.qa_audit_followup_transaction(11,'2026-11-10T16:00:00Z') INTO r;
 IF r<>'BLOCKED_NO_DISPATCH_AUTHORIZATION' THEN RAISE EXCEPTION 'Clean evidence accidentally approved: %',r;END IF;
 IF EXISTS(SELECT 1 FROM axiomos_commercial.qa_followup_decision_audit WHERE decision NOT LIKE 'BLOCKED_%')
 THEN RAISE EXCEPTION 'Dispatch allowed';END IF;
END $$;
SQL
echo "QA_SUPPRESSION_TRANSACTIONAL_WORKER_NO_SEND_PASS"
