#!/usr/bin/env bash
set -euo pipefail
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=postgres PGUSER=neondb_owner PGPASSWORD=qa-only-test
psql -X -v ON_ERROR_STOP=1 -f database/migrations/20261109_qa_signed_delivery_receipts.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO axiomos_commercial.qa_delivery_outbox(test_key,channel,authorized,opt_in,suppressed,due_at)
VALUES('QA-CI-RECEIPT-SMS','sms',true,true,false,'2026-11-09T15:00:00Z');
DO $$
DECLARE k text; id bigint; r text; state text;
BEGIN
 SELECT test_key,outbox_id INTO k,id FROM axiomos_commercial.qa_claim_next_delivery('2026-11-09T16:00:00Z');
 IF k <> 'QA-CI-RECEIPT-SMS' THEN RAISE EXCEPTION 'unexpected claim'; END IF;
 SELECT axiomos_commercial.qa_store_provider_acceptance(id,'telnyx','qa-ci-provider-0000001') INTO r;
 IF r <> 'ACCEPTED_RECORDED_NO_DELIVERY' THEN RAISE EXCEPTION 'acceptance failed %',r; END IF;
 SELECT axiomos_commercial.qa_store_provider_acceptance(id,'telnyx','qa-ci-provider-0000001') INTO r;
 IF r <> 'REJECTED_NOT_CLAIMED' THEN RAISE EXCEPTION 'second accepted %',r; END IF;
 SELECT axiomos_commercial.qa_apply_verified_delivery_event('telnyx','qa-ci-provider-0000001','qa-ci-event-00000001','sent') INTO r;
 IF r <> 'EVENT_RECORDED' THEN RAISE EXCEPTION 'sent failed %',r; END IF;
 SELECT axiomos_commercial.qa_apply_verified_delivery_event('telnyx','qa-ci-provider-0000001','qa-ci-event-00000002','delivered') INTO r;
 IF r <> 'EVENT_RECORDED' THEN RAISE EXCEPTION 'delivery failed %',r; END IF;
 SELECT axiomos_commercial.qa_apply_verified_delivery_event('telnyx','qa-ci-provider-0000001','qa-ci-event-00000002','delivered') INTO r;
 IF r <> 'DUPLICATE_EVENT' THEN RAISE EXCEPTION 'replay allowed %',r; END IF;
 SELECT axiomos_commercial.qa_apply_verified_delivery_event('telnyx','qa-ci-provider-0000001','qa-ci-event-00000003','sent') INTO r;
 IF r <> 'IGNORED_TERMINAL_OR_STALE' THEN RAISE EXCEPTION 'stale status allowed %',r; END IF;
 SELECT axiomos_commercial.qa_apply_verified_delivery_event('telnyx','qa-unknown-message','qa-ci-event-00000004','delivered') INTO r;
 IF r <> 'UNKNOWN_MESSAGE_ID' THEN RAISE EXCEPTION 'unrecognized ID allowed %',r; END IF;
 SELECT delivery_state INTO state FROM axiomos_commercial.qa_provider_receipts WHERE outbox_id=id;
 IF state <> 'delivered' THEN RAISE EXCEPTION 'status drift: %',state; END IF;
END $$;
SQL
export PGUSER=postgres PGPASSWORD=qa-ci-postgres
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_reader','axiomos_commercial.qa_apply_verified_delivery_event(text,text,text,text)','EXECUTE')")" = "f"
test "$(psql -X -A -t -c "SELECT has_function_privilege('axiomos_commercial_writer','axiomos_commercial.qa_store_provider_acceptance(bigint,text,text)','EXECUTE')")" = "f"
echo "QA_PROVIDER_RECEIPTS_NO_SEND_PASS"
