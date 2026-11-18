# AxiomAI WhatsApp — Neon scheduled synthetic QA worker certified
Date: 2026-11-17 UTC. Verdict: **PASS for isolated synthetic QA scheduler**, **NOT production-certified**.

## Infrastructure
- Neon project `icy-field-92690259`.
- Isolated QA branch `br-steep-violet-av0c6t3v` (`qa-whatsapp-delivery-cert-20261116`).
- Neon Function slug `axiomworkerqa`, deployment version 2, status `completed`, runtime Node.js 24.
- Trigger `trigger-76bea9e6-2f40-4190-ad0b-5a0068513e49`, name `axiomos-whatsapp-qa-worker-simulation`.
- Schedule `*/5 * * * *` UTC, `enabled=true`; restored after temporary `* * * * *` verification.
- Function source: `neon/qa/axiomworkerqa/index.mjs`.
- QA run ledger: `db/qa/whatsapp_worker_runs_qa.sql`, table `public.whatsapp_worker_runs_qa`.
- Neon Function uses only an injected `DATABASE_URL` and enforces exact QA host `ep-gentle-bird-avjgh225.c-11.us-east-1.aws.neon.tech`.
- No credentials or external provider API calls embedded in code. Never send WhatsApp, SMS, email or AI requests.

## Scheduled-run proof (direct Neon QA SQL)
`2026-11-17 15:06 UTC`: `status=ok`, `quarantined=1`, `stale_intake=1`, `replies_reconstructed=1`, `mocked_sent=2`.
`2026-11-17 15:07 UTC`: `status=ok`, `quarantined=0`, `stale_intake=0`, `replies_reconstructed=0`, `mocked_sent=0` — confirms no repeated mock sends.

## Persisted fixture evidence
- `qa-e2e-worker-cron-expired-20261117`: `state=unknown`, `attempts=1`, `last_error_code=EXPIRED_PROCESSING_LEASE`, outbound ID null.
- `qa-e2e-worker-cron-failed-20261117`: `state=sent`, `attempts=2`, outbound ID `qa-provider-mock-qa-e2e-worker-cron-failed-20261117-2`.
- `qa-e2e-worker-cron-intake-20261117`: `state=sent`, `attempts=1`, outbound ID `qa-provider-mock-qa-e2e-worker-cron-intake-20261117-1`.
- All IDs are synthetic `qa-e2e-worker-%`; provider acceptance is mocked.

## Security and limitations
- QA-only Postgres access is enforced by matching the host; SQL filters only allow `qa-e2e-worker-%` and synthetic BSUID recipients.
- Scheduled requests must include Neon trigger header and valid schedule envelope; Neon proxy strips client-forged `x-neon-*` headers per Neon documentation.
- This function only writes synthetic mock-state and a QA run ledger. It is not a commercial production outbox or live Dualhook sender.
- Need real Brain regeneration, provider delivery receipts, webhook signature controls, business-plan compliant host, production database branch identification, live Meta QA E2E and backup+rollback before any release.
- No GitHub merge, no production database/schema/config/tokens/webhooks changed.

## Official references
https://neon.com/docs/compute/functions/triggers/overview
https://neon.com/docs/compute/functions/triggers/schedule

## Follow-up verification and security cleanup (same day)
- Changed cron to one minute briefly to verify execution, then returned to `*/5 * * * *` UTC. Trigger is enabled and points to `axiomworkerqa`.
- Neon run ledger subsequently confirmed scheduled runs at `15:05`, `15:06`, `15:07` and `15:10` UTC, all marked `ok` (check at `15:11 UTC`).
- Final health view `public.whatsapp_worker_health_qa` was created and versioned at `db/qa/whatsapp_worker_health_qa.sql`. At 15:11 UTC it reported `total_runs=4`, `logged_errors=0`, `uncertain_count=2`, `retryable_count=0`, `expired_processing_count=0`, `schedule_health=recent_execution_confirmed`.
- Removed temporary test GET handlers `app/api/whatsapp/qa-cert/route.ts` and `app/api/whatsapp/qa-worker/route.ts` from the audit branch to prevent shipping query-secret test interfaces.
- Final QA Preview after removing routes reached `READY` at commit `4680e2ae16429a2bd464632ebee2ac883e3af167`. These GitHub branch changes do not affect the separate Neon scheduled function.
- Main commercial Vercel deployment remains `READY`, main commit `8c68202106bd03ef9cad3a25323f95ea06d243a3`. No commercial secrets or webhooks changed.
- Separate Meta QA Vercel project has keys for test WABA ID, phone ID, app secret, allowed sender, access token, webhook verify token scoped to feature preview branch; values were not accessed or modified. Existence does not establish real-number messaging readiness.
- **Important:** This does not certify actual Meta delivery or production autonomous recovery; the worker operates only on synthetic QA data and simulates provider acceptance. The health view is not an automated notification or escalation mechanism.
