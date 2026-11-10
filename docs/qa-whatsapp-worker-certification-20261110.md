# AxiomOS Autopilot — WhatsApp QA + no-send worker certification

Date: 2026-11-10; scope exclusively QA (no real Meta requests, customer messages, SMS, production branch updates, or token modifications).

## Completed
- `app/lib/qa-whatsapp-status-ingress.mjs`: verifies Meta HMAC-SHA256 over exact raw HTTP bytes before parsing; rejects when WABA or phone_number_id do not match configured QA values. Only processes supported status events, never inbound message bodies. Uses a stable dedupe key independent of webhook batch order. It does not create unknown provider message IDs.
- `tests/qa-whatsapp-status-ingress.test.mjs`: 18 targeted synthetic tests, including forged signatures, cross-account data, cross-number data, duplicates, unknown IDs, invalid timestamps, excessive payloads, store failure and fail-closed production mode.
- `scripts/test-qa-whatsapp-http-postgres.mjs`: real localhost HTTP POST with a **synthetically generated** HMAC, backed by disposable PostgreSQL in CI. Confirms signed sent/delivered/read progress, duplicates once, HMAC rejection, unknown WABA/number and no additional attempts.
- `app/lib/qa-autopilot-worker-cycle.mjs`: QA read-only CRM audit + dry-run planning of synthetic candidate claims. It makes zero provider calls and zero database writes. Synthetic claims are illustrative and **not** approvals for any of the real CRM rows.
- `tests/qa-autopilot-worker-cycle.test.mjs`: 11 worker dry-run tests, including eight unconsented CRM fixtures, duplicate candidate, revocation, WhatsApp 24h window, production isolation and DB outage.
- Neon QA live read-only query on `br-soft-band-av98etp4`: **2** opt-out and **6** unknown followups, all `needs_review`. No real dispatch is authorized.

## CI evidence
GitHub PR #103; GitHub Actions `AxiomOS isolated QA policy (NO SEND)` run **42906524506**, success **151 tests / 151 pass / 0 fail**; `AxiomOS QA transactional outbox` run **42906524465**, success with both `QA_TELNYX_SIGNED_HTTP_POST_TO_POSTGRES_PASS` and `QA_WHATSAPP_SIGNED_HTTP_POST_TO_POSTGRES_PASS`.

## Remaining limitations
- No independently scoped QA Meta app secret + WABA ID + test phone ID and separate reachable deployed QA webhook have been validated in this phase. Therefore **real Meta webhook receipt verification remains pending**; local HMAC is not equivalent to a signed webhook from Meta.
- No autonomous commercial worker exists in production. QA worker is a read-only assessment and does not claim real jobs or send to any provider.
- The deployed Telnyx Preview remains separate; no further real SMS or production endpoint changes. CRM production followups remain blocked until valid consent evidence, full transactional worker checks and deployment approval.
- PR #103 stays draft and is not merged.

Decisions: `WHATSAPP_SIGNED_SYNTHETIC_HTTP_POSTGRES_PASS`, `QA_WORKER_READONLY_151_TESTS_PASS`, `REAL_WHATSAPP_QA_E2E_PENDING`, `AUTONOMOUS_COMMERCIAL_DISPATCH_NO_GO`.
