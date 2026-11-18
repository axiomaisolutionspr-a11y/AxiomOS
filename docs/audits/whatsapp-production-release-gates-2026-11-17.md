# AxiomAI WhatsApp: production-release gate audit
**Date:** 2026-11-17 UTC
**Status:** NO-GO for production release. Isolated QA only.
**Branch:** `audit/whatsapp-inbound-outbound-20261116`, draft PR #114.
**QA deployment:** `dpl_6N3wg8XcXKRe1y66R1MoZyYiBM56`, commit `f1f671c13ad7ff061aa434167ef7877f6ce56e52` READY.
**Production deployment at inspection:** `dpl_F9B4GP4jmXHETq2xw37o6BSRVBX1`, `main`, commit `8c68202106bd03ef9cad3a25323f95ea06d243a3`, READY. **No production changes or deployment**.

## Confirmed QA passes
- Signed synthetic webhook reaches deployed Next.js handler.
- Synthetic send accepted and correlated to outbound ID in Neon QA.
- Transient HTTP 503 followed by duplicate re-delivery can recover once; independent on-demand worker can recover without a second webhook.
- `sent`, `delivered`, `read`, `failed` webhook receipts are persisted and reconciled; duplicate identical receipts do not duplicate DB records, late `sent` does not overwrite `read`, receipt-before-ack can reconcile.
- Ambiguous timeout `qa-e2e-timeout-lease-20261117` remains `unknown` with 1 attempt and null lease and null retry schedule.
- Expired processing `qa-e2e-worker-expired-20261117` quarantined to `unknown`, `EXPIRED_PROCESSING_LEASE`, attempts=1; no resend.
- Only QA synthetic IDs used; no real provider sends, customer contact, email or SMS.

## Blocking release gates (not yet satisfied)
**P0 — reliable intake.** The webhook currently returns HTTP 200 with processing errors and persists an inbound message before the AI reply is created. If Brain fails or an error occurs before caching a reply, redelivery is deduplicated and may never recover. Production needs atomic durable intake/outbox with worker, monitoring and dead-letter state independent of webhook redelivery; tests for mid-flight crash.
**P0 — durable outbound.** API acceptance is not delivery. Store the provider-assigned message ID; reconcile real Meta statuses, and never auto-retry `unknown` outcomes. Multipart, concurrent sends, 429/503 backoff, Meta #100 no-retry and max attempts need production tests.
**P0 — webhook authenticity and routing.** Dualhook's Meta app sends webhook overrides directly from Meta with an app secret not provided to clients. Verify actual routing/expected WABA/phone_id on the correct endpoint; do not enable mismatched HMAC enforcement that would drop legitimate traffic. Design origin controls compatible with Dualhook and Meta.
**P0 — live isolated-provider E2E.** The QA Meta app/phone configuration exists in separate Vercel project `axiomos-autopilot-whatsapp-qa`, scoped to `feature/axiomos-whatsapp-meta-qa-20261110`. Need an expressly authorized test recipient, correct sandbox subscription and one real message with acceptance ID, status webhooks, delivery receipt and optional replay. No live messages have been sent in this run.
**P0 — scheduler.** The QA worker is authenticated on-demand GET, not actually scheduled. Current Vercel team plan is Hobby; official Vercel docs restrict recurring Cron to once/day and Hobby to noncommercial use. Neon Function Triggers are a possible branch-scoped scale-to-zero-compatible schedule, but the trigger service returned branch not found for isolated QA branch, not enabled here. No plan, cron, or Neon trigger was changed.
**P0 — operational security.** QA routes `/api/whatsapp/qa-cert` and `/api/whatsapp/qa-worker` authenticate using a query-derived token in URL and are test-only. Never ship these in production; use authenticated POST/Bearer with restricted scheduler or service identity, no credentials in URLs/logs, rate limits, redact PII.
**P0 — production database identity and data integrity.** Read-only aggregate inspection on 2026-11-17 found Neon default branch `br-square-field-avmxjhvf`: 162 WhatsApp rows (82 user, 80 assistant), most recent 2026-11-07 01:59 UTC; separate `br-proud-frog-avxt19iu` branch: 214 rows (109 user, 105 assistant), most recent 2026-11-16 23:55 UTC. **These counts do NOT reveal which branch production uses.** Verify effective production DB identity through an authorized, secret-free diagnostic before migrating or switching anything. Keep complete CRM contact/alert testing, deduplication, replay-safe updates, retention and operator audit trail in release gate.
**P1 — release.** Validate production backup + restore, migrations on staging, CI checks, staged rollout behind flag, rollback procedure and owner sign-off. Do not merge QA-only code.

## External documentation checked
- Dualhook Webhook Override https://dualhook.com/docs/webhook-override
- Dualhook Messaging Webhook https://dualhook.com/docs/messaging-webhook
- Dualhook Runtime Errors https://dualhook.com/docs/runtime-api-errors
- Dualhook Error #100 https://dualhook.com/docs/whatsapp-error-100
- Vercel Cron limitations https://vercel.com/i/event-driven-architecture
- Vercel Hobby terms https://vercel.com/docs/limits/fair-use-guidelines
- Neon scheduled Function Triggers https://neon.com/docs/compute/functions/triggers/schedule

## Decision
**NO-GO** for production. Keep production unchanged; do not merge PR #114. Prioritize reliable intake/outbox, secure scheduled worker, live isolated Meta test and a controlled release gate. This finding is not a deployment failure: the QA build passes, but those operational controls are not yet certified.
