# AxiomOS Autopilot — QA release gates and handoff (2026-11-10)

## Completed and independently observed
- Telnyx SMS one-shot delivery from Nov 9 and signed independent Telnyx webhook from Nov 10: completed; **do not repeat**.
- Telnyx two signed events were retrospectively reconciled in the independent Neon QA child. Synthetic signed HTTP-to-Postgres tests also pass. Deployed Preview shows a restricted database connection; signed new external Telnyx POST persistence still not externally certified.
- WhatsApp Meta HMAC, matching WABA/phone IDs, duplicate signatures, receipt transitions and localhost signed HTTP-to-Postgres: synthetic integration tests pass; no independent live Meta QA app/WABA/phone configuration was verified.
- QA CRM history includes 5 `accepted` marketing attempts, **not delivered claims**; history coverage and suppression coverage remain 0 / not certified. Current CRM: 8 needs_review; 2 opt_out, 6 unknown consent.
- Transactional followup decision v3 denies missing consent, stale/unknown history, 24h and seven-day frequency excess, channel/global suppression, unknown suppression and all other missing release authorizations.
- The QA-only worker `qa_run_worker_audit(text,timestamptz,integer)` is installed in Neon QA `br-soft-band-av98etp4`, on backup `br-bold-breeze-avd8oivw` created before migration. It ran on the 8 real QA rows (all `BLOCKED_NO_CONSENT`) with `run_key=QA-RUN-20261110-FINAL-0001`. A second invocation returned `DUPLICATE_NO_SEND`, did not append audit rows. Total audit rows after first run: 32. Zero approved.
- Latest passing worker test: GitHub Actions run **42916271390**, marker `QA_TRANSACTIONAL_WORKER_CYCLE_NO_SEND_PASS`. All code in draft PR #103. None merged to main.

## Remaining mandatory gates, NOT satisfied
1. **Meta WhatsApp independent test environment.** An administrator must open https://developers.facebook.com/apps and set up an app with WhatsApp test WABA, test phone number and permitted recipient in a separate non-production integration. The existing production WABA or Cloud API keys must not be reused. Document only the harmless IDs (test WABA ID, test phone number ID) and configure APP SECRET / token solely in encrypted QA environment variables. Do not paste secrets/OTP in ChatGPT or GitHub.
2. **Meta signed E2E.** Test the sandbox webhook challenge and a real `X-Hub-Signature-256` callback to an isolated public QA receiver, verify both WABA and phone_number_id, reconcile a pre-registered test provider message ID with idempotent storage, and retain redacted evidence. A synthetic HMAC test is NOT this certification.
3. **Complete contact provenance.** Independently reconcile opt-out (STOP) receipts, suppression state across channels, historical sends/uncertain attempts and coverage for each prospect. Never assume zero historical messages from an absent row; never auto-authorize the eight QA followups.
4. **True dispatch worker.** Current QA worker only audits. Build outbound job claims, provider-specific idempotency and uncertain-outcome reconciliation with durable audit, concurrency, ownership/roles, rollback and rate limits. Protect with an explicit disabled-by-default feature gate and zero sends without fresh consent and suppression coverage.
5. **Pre-release review and approval.** Review all code and security, verify exact commit and CI status, merge only when safe, roll out to Preview first, certify webhooks and error monitoring, then request explicit authorization for gradual production enablement. Leave the production webhook and credentials untouched until that authorization.

## What the system is allowed to claim today
- PASS: QA safety simulation and QA no-send worker cycle.
- PASS: historical Telnyx delivery/signature verification, without repeats.
- NO-GO: live Meta QA signed delivery receipt, real dispatch worker, customer autonomous sends, production activation.
- Stop conditions: missing independent Meta test app, incomplete consent/suppression history, no audited dispatch implementation, or unresolved merge/CI checks.

Do not misrepresent QA audit success as a production-ready autonomous CRM.
