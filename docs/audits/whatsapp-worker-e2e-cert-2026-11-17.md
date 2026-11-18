# AxiomOS WhatsApp QA: independent recovery worker certification — 2026-11-17

## Scope and source
- GitHub branch `audit/whatsapp-inbound-outbound-20261116` (draft PR #114), not merged to main.
- Neon isolated branch `br-steep-violet-av0c6t3v`.
- Vercel Preview deployment `dpl_GReFS9vKSZLr5srsicP8fpLTYWti`, commit `7bc4ca6f9414fe0411fee12f1edf57633b6859d9` reported READY.
- QA routes `/api/whatsapp/qa-cert` and `/api/whatsapp/qa-worker` are guarded by branch, host, feature flags and QA secret. They must not be shipped to production.

## Technical finding
Dualhook documents that outbound runtime does not automatically retry sends because duplicate delivery could result. Inbound message-path and statuses go from Meta directly to the app via the WABA webhook override; Dualhook cannot replay them. Therefore recovering only on Meta re-delivery is inadequate.

## Test sequence (all synthetic; no real messages)
1. QA synthetic signed webhook with case worker (`qa-e2e-worker-20261117`) was received by the real Next.js route on Vercel; deliberate simulated HTTP 503 produced expected processing error and cached answer in the isolated QA Neon table.
2. Independently invoked QA worker endpoint; HTTP 200 response `{"ok":true,"source":"isolated_qa_worker","inspected":1,"recovered":1,"uncertain":0,"skipped":0}`.
3. Neon table verified `qa-e2e-worker-20261117` `state=sent`, `attempts=2`, `outbound_message_id=qa-provider-mock-qa-e2e-worker-20261117-2`, cleared error.
4. Invoked worker again: `inspected=0,recovered=0` (idempotent).
5. Verified uncertain control `qa-e2e-unknown-20261117` remained `state=unknown,attempts=1` (not resent).

## Result
PASS — deployed-app recovery without webhook re-delivery, synthetic provider acknowledgement, persisted Neon state, repeat prevention, and unknown quarantine.

## Remaining before live-provider certification
- No genuine Meta/Dualhook outbound request or delivery status was performed.
- Provider response IDs must be durably associated with status webhooks and reconciled to `sent/delivered/read/failed`. An API-accepted response is NOT proof of recipient delivery.
- QA worker currently manual/on-demand; production automation/scheduling, alerting, leases, backoff and error classification are not finished.
- Webhook signature issue: Dualhook's Meta app signs inbound events with Dualhook's non-shareable app secret. Do NOT enable `AXIOMOS_WHATSAPP_SIGNATURE_ENFORCE` in production without alternate validation architecture. Validate expected WABA and phone IDs and use a high-entropy callback URL under HTTPS, after controlled cutover.
- This QA route uses synthetic BSUID-only events, a fake Brain reply, and in-memory provider response; E2E live real customer is not certified.
- The generic POST webhook returns HTTP 200 even for processing errors, so Meta retries cannot be relied upon; intake durable queue and production worker still needed.
- Remove QA test endpoints and secrets before production promotion. Do not touch live callback, tokens, or credentials.

## Reference documentation
https://dualhook.com/docs/webhook-override
https://dualhook.com/docs/messaging-webhook
https://dualhook.com/docs/basics-overview
https://dualhook.com/docs/coexistence
