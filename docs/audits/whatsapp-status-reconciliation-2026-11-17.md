# WhatsApp E2E QA: receipt correlation and recovery — 2026-11-17

## Verified infrastructure
- Vercel Preview deployment dpl_6aQJCjxH34Jx6e2g7UAErAqrzy5r is READY at commit dd1ee9941e307e1d9f26cd3aef3f6c1c756ff8ed. All changes remain on audit branch; main untouched.
- Neon branch br-steep-violet-av0c6t3v has `whatsapp_delivery_qa` columns for outbound ID, provider status/time/error and `next_retry_at`; `whatsapp_status_events_qa` stores receipts with uniqueness across outbound ID + status + provider timestamp.
- A separate Meta test app/number configuration exists in Vercel project `axiomos-autopilot-whatsapp-qa`, scoped to `feature/axiomos-whatsapp-meta-qa-20261110`. DO NOT confuse its credentials, webhook and database with the isolated audit Preview project.

## Deployed QA tests (synthetic Meta-style signed events, real Next.js route, mock outbound provider)
- `receipt_early` prior to outbound row, then `status_early_base` -> provider_status `delivered` persisted and correlated after acceptance.
- `status_base`, `receipt_sent`, `receipt_delivered`, `receipt_delivered` duplicate, `receipt_read`, `receipt_late_sent` -> state `sent`, provider_status `read`, no regression to `sent`.
- `status_failure_base`, `receipt_failed` -> provider_status `failed`, provider_error_code `131036`.
- All HTTP calls returned 200, without processing errors.
- Neon verification:
  - `qa-e2e-status-base-20261117`: outbound `qa-provider-ack-qa-e2e-status-base-20261117`, provider_status `read`.
  - `qa-e2e-status-early-20261117`: provider_status `delivered`.
  - `qa-e2e-status-failure-20261117`: provider_status `failed`, provider_error_code `131036`.
- Repeated identical `delivered` webhook was deduplicated at DB level. `sent` can be recorded with a different timestamp as a distinct event, while the rolled-up provider status remains `read`.

## Verification boundaries
PASS: deployed-app synthetic receipt recording and correlation (including duplicate/out-of-order/before-ack); QA recovery with duplicate prevention and unknown quarantine (earlier test).
NOT CERTIFIED: real Meta/Dualhook deliveries, a fully configured recurring worker, customer message end-to-end, real Brain reply, production security and rollout.
- QA worker runs on authenticated GET on demand, not a deployed scheduled trigger. Do not assert background autonomy.
- QA guard must be removed/productionized separately; CI and branch-specific secrets must not be promoted to main.
- A provider `failed` receipt is stored in a separate status field and is NOT automatically categorized as retryable; this avoids a mistaken duplicate send.
- A provider `sent` acknowledgement is not equivalent to `delivered` or `read`.
- The provider's actual webhook HMAC cannot be verified using an unrelated Meta app secret when callbacks are signed by Dualhook's Meta app; a compatible security design and controlled live test are outstanding.
- Avoid using a previously exposed recovery or QA secret in production; rotate QA test secret before future external QA.

## Production gates remaining
1. Implement production durable intake + scheduled worker with least-privilege scheduler authorization and alerts, migration and rollback.
2. Validate provider call's real message ID, real recipient, and status webhook (ideally isolated Meta test number with one specifically authorized recipient).
3. Validate status error handling for actual Error #100, 429/503 and ambiguous timeout without blindly resending.
4. Test security boundaries, concurrency and split/chunked sends; remove QA GET routes and disable QA flags.
5. Back up commercial CRM and deploy behind rollout flag after review; compare production CRM data and event processing.

No production config, tokens, webhook or client messaging changed in this phase.
