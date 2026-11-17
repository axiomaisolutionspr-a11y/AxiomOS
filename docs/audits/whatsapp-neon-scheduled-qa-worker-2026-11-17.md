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
