# AxiomOS — E2E validation matrix and current blocker register
Date: 2026-11-03. **No production changes authorized by this file.**

## Confirmed
- CRM v2 SQL revocation check on `axiomos_security_qa`: active count 1 -> revoke -> active count 0; insert/login-attempt table tested under limited role.
- CI security-hardening run #19 succeeded for commit a7e083c.
- Latest preview build (commit 2ae6bd7 and subsequent commits): check fresh status before quoting as passed.
- POS QA branch has pos_* tables, while its branch-specific Vercel variables `POS_QA_DATABASE_URL`, `POS_QA_SESSION_SECRET` and `POS_QA_USERS_JSON` do not have effective non-empty values in the non-decrypted inventory. This alone does not certify availability; run the provider-side secret preflight.
- WhatsApp production runtime aggregates show WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN and WHATSAPP_CONTACT_EMAIL_FAILED groups (10 reported occurrences each in visible aggregation); investigate delivery/provider status without resending automatically.

## Required tests before release
| Test | Expected response | Status |
|---|---|---|
| CRM QA wrong PIN, valid PIN and issued cookie | 401, 200; HttpOnly Secure SameSite strict | Not run; QA-only access PIN not configured |
| CRM QA cookie -> protected route -> logout -> replay | 200 -> 200 -> redirect/401 | Not run; requires verified isolated full CRM and protected runner |
| CRM limiter 6 attempts | first 5 denied login then 429 | Unit/SQL only; HTTP not run |
| WhatsApp HMAC signed raw payload and tampering | Accept signed; 401 altered/unsigned | Unit test passed; provider webhook not exercised |
| WhatsApp managed Dualhook | Verified provider-origin authentication | Blocked: payload identity is not signature authentication |
| Telnyx Ed25519 signed/stale/tampered | Accept authentic; 401 rejected | Synthetic unit tests only |
| POS authentication + order + logout + replay | E2E authenticated, tenant isolated, 401 replay | Blocked by safely injecting QA-only secrets |
| Operational alerting and notification delivery | Detect failed SMS/email and investigate provider acknowledgment | Open |

## Safe next steps
1. Set isolated QA-only CRM PIN and CRM_RATE_LIMIT_SECRET in *branch-scoped Preview* after verifying the effective DB binding and protecting the Preview. Do not reuse live CRM credentials.
2. Run negative/read-only tests first. For authenticated write E2E, create a dedicated synthetic fixture dataset in isolated QA, not a copy of live prospects.
3. Resolve POS secret integration through protected provider tooling; do not embed tokens or passwords in repo or logs.
4. Confirm Dualhook incoming-webhook origin authentication (signed relay, protected ingress or provider-managed secret); do not use a message's account ID as proof of sender.
5. Inspect provider callback error classes and send logs in redacted form; test retries only with synthetic contact addresses and opt-out-safe behavior.
6. Capture CI, Preview deployment and test run IDs in PR before asking for production cutover.
