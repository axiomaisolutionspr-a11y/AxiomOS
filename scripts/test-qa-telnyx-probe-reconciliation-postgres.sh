#!/usr/bin/env bash
set -euo pipefail
# CI-only ephemeral Postgres, synthetic events, no web requests or providers.
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGPASSWORD=qa-ci-postgres
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE ROLE axiomos_autopilot_e2e_reader NOLOGIN;
CREATE ROLE axiomos_autopilot_e2e_worker NOLOGIN;
CREATE ROLE axiomos_qa_telnyx_ingress LOGIN PASSWORD 'qa-only-test';
SQL
export PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE axiomos_commercial.qa_telnyx_signed_probe (
 id bigint PRIMARY KEY,
 tenant_id text NOT NULL,
 state text NOT NULL,
 attempts integer NOT NULL,
 provider_message_id text UNIQUE,
 CHECK (attempts BETWEEN 0 AND 1)
);
INSERT INTO axiomos_commercial.qa_telnyx_signed_probe VALUES
 (1,'axiomai','accepted',1,'qa-signed-msg-00001'),
 (2,'axiomai','ready',0,NULL),
 (3,'other','accepted',1,'qa-other-tenant-00002');
SQL
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_telnyx_probe_event_reconciliation.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261110_qa_telnyx_ingress_role_grants.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r text;
BEGIN
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-signed-msg-00001','qa-event-00001','message.sent','sent') INTO r;
 IF r<>'VERIFIED_EVENT_RECORDED' THEN RAISE EXCEPTION 'synthetic sent failed %',r; END IF;
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-signed-msg-00001','qa-event-00002','message.finalized','delivered') INTO r;
 IF r<>'VERIFIED_EVENT_RECORDED' THEN RAISE EXCEPTION 'synthetic finalized failed %',r; END IF;
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-signed-msg-00001','qa-event-00002','message.finalized','delivered') INTO r;
 IF r<>'DUPLICATE_EVENT' THEN RAISE EXCEPTION 'duplicate was not blocked %',r; END IF;
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-unrecognized-00001','qa-event-00003','message.finalized','delivered') INTO r;
 IF r<>'UNKNOWN_OR_UNACCEPTED_PROBE' THEN RAISE EXCEPTION 'unknown accepted %',r; END IF;
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-other-tenant-00002','qa-event-00004','message.finalized','delivered') INTO r;
 IF r<>'UNKNOWN_OR_UNACCEPTED_PROBE' THEN RAISE EXCEPTION 'cross-tenant accepted %',r; END IF;
 SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe(
   'qa-signed-msg-00001','qa-event-00005','message.sent','delivered') INTO r;
 IF r<>'INVALID_EVENT' THEN RAISE EXCEPTION 'mismatched event type accepted %',r; END IF;
 IF (SELECT count(*) FROM axiomos_commercial.qa_telnyx_probe_verified_events)<>2 THEN
   RAISE EXCEPTION 'event count incorrect';
 END IF;
 IF (SELECT attempts FROM axiomos_commercial.qa_telnyx_signed_probe WHERE id=1)<>1 THEN
   RAISE EXCEPTION 'probe attempts modified';
 END IF;
END $$;
SQL
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_autopilot_e2e_worker','axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_commercial_reader','axiomos_commercial.qa_telnyx_probe_verified_events','SELECT')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_qa_telnyx_ingress','axiomos_commercial.qa_reconcile_telnyx_signed_probe(text,text,text,text)','EXECUTE')")" = "t"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_qa_telnyx_ingress','axiomos_commercial.qa_telnyx_signed_probe','SELECT')")" = "f"
test "$(psql -X -A -t -c "SELECT has_table_privilege('axiomos_qa_telnyx_ingress','axiomos_commercial.qa_telnyx_probe_verified_events','INSERT')")" = "f"
export PGUSER=axiomos_qa_telnyx_ingress PGPASSWORD=qa-only-test
test "$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe('qa-signed-msg-00001','qa-event-00002','message.finalized','delivered')")" = "DUPLICATE_EVENT"
test "$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe('qa-unknown-msg-00003','qa-event-00003','message.finalized','delivered')")" = "UNKNOWN_OR_UNACCEPTED_PROBE"
echo "QA_TELNYX_PREVIEW_INGRESS_ROLE_PASS"
echo "QA_TELNYX_PROBE_RECONCILIATION_NO_SEND_PASS"
