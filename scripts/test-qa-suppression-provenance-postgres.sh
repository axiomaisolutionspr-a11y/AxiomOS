#!/usr/bin/env bash
set -euo pipefail
# Disposable CI PostgreSQL only. No messaging or customer identifiers.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_suppression_provenance.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
 IF axiomos_commercial.qa_suppression_evidence(101,'whatsapp','2026-11-10T16:00:00Z')<>'UNKNOWN' THEN
  RAISE EXCEPTION 'Unknown coverage was not denied';END IF;
END $$;
INSERT INTO axiomos_commercial.qa_suppression_events
(prospect_id,channel,event_type,source_system,source_event_key,occurred_at)
VALUES (101,'whatsapp','opt_out','manual_verified','QA-OPT-OUT-101','2026-11-10T14:00:00Z'),
       (109,'global','opt_out','provider_verified','QA-GLOBAL-109','2026-11-10T14:00:00Z');
DO $$
BEGIN
 IF axiomos_commercial.qa_suppression_evidence(101,'whatsapp','2026-11-10T16:00:00Z')<>'SUPPRESSED'
 THEN RAISE EXCEPTION 'Channel optout ignored';END IF;
 IF axiomos_commercial.qa_suppression_evidence(109,'sms','2026-11-10T16:00:00Z')<>'SUPPRESSED'
 THEN RAISE EXCEPTION 'Global optout ignored';END IF;
 IF axiomos_commercial.qa_suppression_evidence(109,'whatsapp','2026-11-10T16:00:00Z')<>'SUPPRESSED'
 THEN RAISE EXCEPTION 'Cross-channel global optout ignored';END IF;
END $$;
INSERT INTO axiomos_commercial.qa_suppression_coverage
(prospect_id,channel,complete,verified_through,verified_at,source_evidence)
VALUES (102,'whatsapp',false,'2026-11-10T16:00:00Z',
        '2026-11-10T15:59:00Z','Synthetic all-sources reconciliation');
DO $$
BEGIN
 IF axiomos_commercial.qa_suppression_evidence(102,'whatsapp','2026-11-10T16:00:00Z')<>'UNKNOWN'
 THEN RAISE EXCEPTION 'Incomplete coverage falsely passed';END IF;
END $$;
UPDATE axiomos_commercial.qa_suppression_coverage SET complete=true
WHERE prospect_id=102 AND channel='whatsapp';
DO $$
BEGIN
 IF axiomos_commercial.qa_suppression_evidence(102,'whatsapp','2026-11-10T16:00:00Z')<>'NO_SUPPRESSION_EVIDENCED'
 THEN RAISE EXCEPTION 'Synthetic complete coverage not recognized';END IF;
 IF axiomos_commercial.qa_suppression_evidence(102,'sms','2026-11-10T16:00:00Z')<>'UNKNOWN'
 THEN RAISE EXCEPTION 'Coverage leaked across channels';END IF;
 IF axiomos_commercial.qa_suppression_evidence(102,'whatsapp','2026-11-10T18:00:00Z')<>'UNKNOWN'
 THEN RAISE EXCEPTION 'Stale coverage was accepted';END IF;
END $$;
SQL
# Source keys must not create duplicate suppression events.
if psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO axiomos_commercial.qa_suppression_events
(prospect_id,channel,event_type,source_system,source_event_key,occurred_at)
VALUES(102,'whatsapp','opt_out','manual_verified','QA-OPT-OUT-101','2026-11-10T14:00:00Z')" >/dev/null 2>&1; then
 echo "Duplicate suppression event wrongly accepted" >&2;exit 1
fi
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_suppression_evidence(bigint,text,timestamptz)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_autopilot_e2e_worker','axiomos_commercial.qa_suppression_events','INSERT')")" = "f"
echo "QA_SUPPRESSION_PROVENANCE_FAIL_CLOSED_NO_SEND_PASS"
