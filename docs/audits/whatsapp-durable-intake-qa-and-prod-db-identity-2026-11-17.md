# AxiomAI WhatsApp: durable-intake QA certification + production DB identity
Date: 2026-11-17. **NO-GO for production deployment.** All changes remain on QA audit branch.

## Source inspection
- Checked the actual `app/api/whatsapp/route.ts`, the QA worker, QA DB schema and the Vercel production/preview environment *metadata*.
- Vercel global `DATABASE_URL` is an integration-managed sensitive secret (env ID `ReRRUBx1XPSi5mPc`), scoped to production and preview, bound to integration store `store_mEWrWvRg2fNUAegS`.
- Read-only inspection of store metadata establishes Neon resource `axiomai-leads`, external project `icy-field-92690259`, connected to Vercel project `axiomai-solutions` and both `production`/`preview`. **No DB URL/password/token was revealed or changed.**
- Vercel integration metadata **does not establish exact Neon branch bound at runtime**. Sensitive values were not decrypted by Vercel API. Separate read-only Neon main/restored counts are circumstantial and not proof of production DB branch identity. The production branch remains UNVERIFIED.

## New durable intake work (QA only)
- Migration `db/qa/whatsapp_delivery_qa.sql` adds `inbound_text`, `recipient_kind`, `recipient_value`, `intake_error`.
- In QA mode, inbound message content and synthetic recipient are saved before duplicate handling and Brain invocation.
- A controlled `QA_TRIGGER_BRAIN_FAILURE` records a recoverable failure after durable intake, before a reply is created.
- The independent QA worker reconstructs a deterministic simulated reply from the saved intake, then runs the existing atomic claimed send flow (which uses mock provider acceptance; no real WhatsApp sent).
- A second worker path detects synthetic `received` records abandoned for over 2 minutes and reconstructs a mock reply without webhook redelivery. Both are restricted to synthetic BSUID and IDs.

## Real deployed-app E2E evidence
Vercel Preview deployment `dpl_4FTPZrpEEQ2m4gk36xURQEbwnopy` returned READY after code commits.
1. Signed synthetic case `worker_brain`: HTTP 200 webhook, accepted inbound=true, intentional processing error=1.
2. Separate worker invocation: HTTP 200; `inspected=1,recovered=1,brainRepliesReconstructed=1`; no second Meta webhook.
3. Neon QA row `qa-e2e-worker-brain-20261117`: `state=sent, attempts=1`, inbound snapshot present, recipient kind BSUID, reply `AXIRA_QA_REPLY_RECOVERED_FROM_INTAKE`, simulated provider acknowledgment stored.
4. Repeat worker invocation: `inspected=0,recovered=0,brainRepliesReconstructed=0`.
5. Synthetic stale intake `qa-e2e-worker-stale-intake-20261117`: seeded as `received` (4 min old), worker reported `staleIntakeRepaired=1,brainRepliesReconstructed=1,recovered=1`; Neon row `state=sent,attempts=1`, mock provider ID saved.
6. Previously certified 503 retry, uncertain timeout quarantine and provider-status reconciliation remain isolated and unchanged.

## Production readiness blockers
- **Do not merge this branch.** The worker generates a **mock reply** and a **mock provider acknowledgment**. This is NOT full real Brain recovery, not real Dualhook delivery, and QA fixture routes are insecure for a production rollout (secret presented via URL query).
- Implement a general-purpose durable production inbox/outbox transaction and real worker that safely persists Brain output, tracks processing phases, prevents duplicate sends, has rate limits/backoff, reconciles real Meta status webhooks, and alerts on unknown outcomes.
- Establish a provider-compatible security control for Dualhook webhook routing, then test with controlled real Meta QA WABA/number and specifically authorized recipient. Do not rotate or swap production tokens.
- Determine actual production DB **branch** using approved secret-free environment diagnostic, not guessed from row counts. Back up and test restoration before migrations.
- Schedule frequent worker execution on a compliant runtime (Vercel Hobby limits apply; Neon scheduled Function Triggers could work but trigger API responded branch not found on this QA branch).
- Remove QA-specific routes and credentials before staging/production. Require CI, authorization, rollback plan, monitoring and canary rollout.

## Change safety
Production branch `main`, commercial Vercel deployment, production env, phone tokens, webhooks and message delivery were never modified by this work.
