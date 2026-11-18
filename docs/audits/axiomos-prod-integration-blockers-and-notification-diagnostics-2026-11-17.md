# AxiomOS Autopilot — Production integration and provider certification worklog
Date: 2026-11-17. **Production release verdict: NO-GO.** Findings grounded in read-only Vercel/Neon metadata, GitHub source/PRs and an isolated QA build.

## 1. Active production Neon branch
Vercel's production `DATABASE_URL` is an opaque Neon managed integration variable from project `axiomai-leads` / `icy-field-92690259`. The API does not disclose the connection URL's effective hostname or branch. `AXIOMOS_COMMERCIAL_LIVE_DATABASE_ENABLED` is **true** for production; `AXIOMOS_COMMERCIAL_ENABLED` is **not defined** for production. Neither establishes the active connection's branch.

Corroborated read-only evidence:
- Production runtime error groups on 2026-11-17 14:30:01 UTC involve CRM prospect ID `171`: `WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN` and `WHATSAPP_CONTACT_EMAIL_RECEIPT_SAVE_FAILED`.
- Neon branch `br-proud-frog-avxt19iu` (`restore-test-crm-legacy-prospectos-20261108`) contains that ID: `created_at=2026-11-17 14:25:11 UTC`, `updated_at=2026-11-17 14:30:01 UTC`; 40 prospects and most recent prospect 2026-11-17.
- Neon default `br-square-field-avmxjhvf` has 33 prospects, no ID `171`, most recent prospect 2026-11-08.
- Branch `br-bold-credit-avlbvms4` has 39 prospects and no ID `171`.
**Inference:** `br-proud-frog-avxt19iu` is an exceptionally strong candidate for the live WhatsApp/CRM data branch, but a secret-free runtime branch fingerprint `current_setting('neon.branch_id',true)` on the actual production connection is still required for definitive confirmation. No production DB env override or branch switch was attempted.

Existing owner-only source in `main`:
`app/prospectos/autopilot/seguimientos/prueba-sms/diagnostico/page.tsx`
queries `neon.branch_id` on CRM commercial reader and writer. Its use depends on owner session and commercial identity activation.

## 2. SMS and email notification failures
Observed runtime errors:
- `WHATSAPP_CONTACT_EMAIL_RECEIPT_SAVE_FAILED` on live route.
- `WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN` on live route.
The current code `app/lib/whatsapp-contact-request.ts` distinguishes Resend acceptance from DB receipt persistence failure, and reserves a Telnyx attempt before sending. A failure does **not** prove a message was never sent. Do not automatically resend.
Read-only database examination of prospect 171 found neither a `WA_EMAIL_ACCEPTED` nor a `WA_SMS_ATTEMPT` nor a `WA_SMS_ACCEPTED` marker, which alone does not determine provider delivery status.
The historical branch `prospects.crm_notes` is text; `concat_ws` expression is supported. No conclusive SQLSTATE/response code was preserved in production logs.

QA-only patch:
`app/lib/whatsapp-contact-request.ts` now logs restricted SQLSTATE / severity / constraint-presence on SQL receipt failures, without provider response bodies, client message text or token material. GitHub commit `d03f521ecb95a343d780a3f2d094e8582b7b67da`, Vercel QA deployment `dpl_4jG9HYY1eG2wW3jJG1KnxDopVdqc` READY.
This is **diagnostic readiness**, **not resolved notifications**. Provider-side lookup by accepted message ID and actual production SQLSTATE are still needed. Do not repeat the uncertain SMS or email.

## 3. Autonomous engine readiness
- PR #107 (draft, open) on branch `feature/axiomos-whatsapp-followup-worker-20261111` contains a cron-authorized worker, an atomic SQL claim, consent and opt-out enforcement, recipient frequency limits, event coverage requirements and provider mock tests. Its Vercel Preview `dpl_4tjobQsPJTsmctZmFMtFXwrvthgL` is READY, not a production release.
- Its own README states source coverage `whatsapp_followup_coverage` must be connected and kept fresh, owner permissions and consent recorded, role provisioned and real sending expressly enabled. **Do not merge or enable PR #107 until coverage, security role, database branch and provider status are proven.**
- PR #101/#103 include additional isolated QA gates; no evidence that their controls and all migrations coexist safely in deployed `main`.
- Neon QA scheduled worker `axiomworkerqa` runs every 5 min on QA branch and only produces fake outbound acceptance; not a production worker.
- Production `main` lacks the PR #107 worker route and file.

## 4. Meta/Dualhook delivery and CRM auth
- No Meta/Dualhook real send or `delivered/read` status was performed in this session. Dedicated Vercel Meta QA project and branch-scoped variables exist, but no provider-native authenticated action is connected here. Neither code build nor mock status is evidence of delivery.
- Commercial Autopilot user-facing `app/prospectos/autopilot/page.tsx` requires `commercialIdentityAuth().getSession()` plus active tenant membership; absence of production `AXIOMOS_COMMERCIAL_ENABLED` means this individual-login feature is not affirmatively enabled. Legacy PIN CRM still exists as a separate login. Without an authorized session, the owner-only user acceptance test cannot be completed safely.
- A passive GET to the commercial deployment is not a proof of authenticated session behavior.

## 5. Release decision and immediate gates
1. Confirm effective Neon branch using owner-authenticated, secret-free reader and writer diagnostic.
2. Reconcile existing Resend/Telnyx notification outcomes before a new test; identify SQLSTATE and permission/DB connection cause of receipt failures.
3. Verify opt-in, opt-out, coverage source, restricted worker database role and max frequency in one integrated QA branch with CI.
4. Verify isolated Meta QA phone, sender, callback, one expressly authorized real delivery and receipt stored under same outbound ID.
5. Verify CRM owner/operator login, session revocation, notes/stage/assignment persistence, duplicate and missing leads, recovery and rollback on a production-like staging environment.
6. Back up and test restore, and use canary flag; do not promote QA-only test paths or mocked sender to production.

**All changes in this worklog remain in audit QA. No production tokens/keys, Meta or Telnyx webhooks, Vercel product env, Neon productive data or production deployments were modified.**
