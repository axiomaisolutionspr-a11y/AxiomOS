# Telnyx signed-receipt ingestion — isolated QA Preview (10 November 2026)

## Scope and safety
The owner requested implementing automatic registration of *future* signed Telnyx receipt events in CRM QA. This implementation does **not** send SMS or WhatsApp, change Telnyx callback configuration, rotate/reuse production secrets, merge code to main, or modify the live independent QA receiver.

## Implemented and verified
- Created `app/lib/qa-telnyx-ingress.mjs`, a fail-closed raw-body Ed25519 verification and idempotent persistence pipeline, plus 14 regression tests. It rejects tampering, expired signatures, unrecognized events and unknown/unaccepted message IDs. A database timeout yields retryable 503, never a false success.
- Added standalone Vercel QA receiver under `services/qa-telnyx-webhook/`: preview-only `api/telnyx.js`, `api/health.js`, `qa-ingress.mjs`, `verify.mjs`, and minimal package manifest.
- Scoped NEW Postgres login role `axiomos_qa_telnyx_ingress` to an otherwise empty QA schema `axiomos_qa_ingress_scope`. Granted USAGE on `axiomos_commercial` and EXECUTE on **only** `qa_reconcile_telnyx_signed_probe`; no SELECT on the probe table and no direct INSERT into event table. No privileged owner connection used by the receiver.
- Versioned the role-grants migration `database/migrations/20261110_qa_telnyx_ingress_role_grants.sql`. On Neon QA `br-lively-band-avj6yz8x`, authenticated execution as the ingress role returned `DUPLICATE_EVENT` when passed the existing confirmed event, without writing a second row.
- New QA-only credential was stored in Vercel Preview *sensitive* env var; did not print it, and did not change existing keys or tokens. An unchanged Telnyx PUBLIC verification key was scoped separately to Preview.
- Preview deployment `dpl_CjW7Uf3pchA5VRRJvbK1TrhvkwXH` is `READY`; GET `/api/telnyx` returned `qa-auto-persist-preview` and GET `/api/health` returned HTTP 200 `{"ok":true,"mode":"qa-restricted-ingress"}`: confirms real connectivity from Vercel to Neon under the restricted role.
- Existing public receiver `https://axiomos-qa-telnyx-webhook.vercel.app/api/telnyx` still returns `verify-only`, HTTP 200, unchanged.
- CI `AxiomOS isolated QA policy (NO SEND)` run `42901813062` reported **122 PASS / 0 FAIL**. CI `AxiomOS QA transactional outbox` run `42901813073` reported `QA_TELNYX_PROBE_RECONCILIATION_NO_SEND_PASS` plus concurrent claim and receipt checks. A later role-specific test was also added to the outbox CI and should be checked on its final commit before claiming that iteration PASS.
- Neon QA still has **2** historically verified events for one message, the terminal delivery `delivered` once, and the authorized one-shot remains attempts=1. No new send was made.

## What this does NOT prove
- No NEW authenticated Telnyx POST has reached the new Preview deployment. It remains protected by Vercel Preview Authentication, and the current public callback alias continues to point to the unchanged verify-only service. GET health tests permission/connectivity but not new callback persistence end to end.
- Because no subsequent provider event was triggered and the owner does not want to repeat an already completed SMS, we must not label automatic real-provider persistence as certified.
- Do NOT change production aliases, production env vars, or Telnyx webhook settings without a separate reviewed release plan. No customer followups are authorized.

Status: `QA_AUTORECEIVER_PREVIEW_READY`, `QA_DB_RESTRICTED_ROLE_CONNECTIVITY_PASS`, `QA_SIGNED_PROVIDER_PERSISTENCE_E2E_PENDING`, `PRODUCTION_UNCHANGED`.

## Localhost HTTP POST + Postgres integration certification

- CI ephemeral PostgreSQL integration test `scripts/test-qa-telnyx-http-postgres.mjs` sends **real HTTP POST requests only to localhost** with temporary Ed25519 signing keys and synthetic event/receipt IDs.
- Uses the same `receiveQaTelnyxEvent` module and a restricted `axiomos_qa_telnyx_ingress` SQL login in temporary CI Postgres. Tests `message.sent`, `message.finalized/delivered`, duplicate callback, forged signature, unknown message ID, single final receipt, and preservation of the already-used attempt count.
- GitHub Actions `AxiomOS QA transactional outbox` run **42904895005**, commit `9af09423b72b38b5b02c189c4531311ed5864a21`: **success** with `QA_TELNYX_SIGNED_HTTP_POST_TO_POSTGRES_PASS`. Sister policy workflow **42904894997** also succeeded.
- Independent recheck after CI of actual Neon QA branch `br-lively-band-avj6yz8x` showed exactly **2** historical verified events for **1** real message, and the original one-shot state remained `accepted, attempts=1`.
- Neither Telnyx nor WhatsApp received a new message. Preview Vercel deployment was not modified, and the current public Telnyx receiver remains `verify-only`.
- **Boundary:** the success certifies **local HTTP + signed synthetic callback + real temporary PostgreSQL processing**, NOT an external signed Telnyx POST to the deployed protected Preview. `QA_LOCAL_HTTP_POST_TO_POSTGRES_PASS`; `QA_DEPLOYED_SIGNED_POST_E2E_PENDING`.
