# AxiomOS — release readiness and safe migration plan
Date: 2026-11-03
Status: QA ONLY — NOT CERTIFIED FOR PRODUCTION

## Verified evidence
- PR #65 is draft, not merged; GitHub Actions security-hardening run 41733956431 completed successfully on commit 6f9ca0d1c39894463fa5aa37806203ae038636c8.
- Corresponding Vercel Preview deployment is READY; a successful build is not a successful live webhook or database test.
- PR #64 is a separate draft branch and remains uncertified for HTTP end-to-end POS authentication.
- Neon project has main and isolated POS QA branches; production CRM snapshot snap-restless-leaf-av4bp0og is present.
- Vercel environment inventory showed DATABASE_URL assigned to both production and generic preview, and a branch-specific POS_QA_DATABASE_URL with no value on the POS QA branch. This does not establish database isolation for generic Preview. DO NOT run write tests on Preview until its database target is independently verified.

## Release blockers, in priority order
1. Verify Preview database isolation by branch-specific environment assignment and read-only identity checks. Never run write tests against production data.
2. Verify end-to-end CRM v2 session lifecycle using an isolated Neon QA database after the SQL migration: authentication, login throttling, session expiry and revocation, all server actions and proxy behaviors.
3. Confirm WhatsApp ingress source: meta-direct HMAC verifies with the Meta app secret; dualhook-managed payload identifiers are NOT cryptographic authentication. Obtain independently verifiable Dualhook webhook authentication or protect the endpoint upstream before enabling in production.
4. Verify Telnyx Ed25519 with genuine provider event fixtures and public key, signature rejection, clock tolerance, replay handling, duplicate conversation events.
5. Certify POS QA with valid login -> cookie -> catalog -> draft -> logout -> replayed cookie denied, throttling 429, per-merchant row isolation and negative tests. Do not connect real charges.
6. Add reliable server-side audit trail and SLO alerting without logging credentials, raw tokens, or unnecessary personal data.
7. Validate all changes with a rollback drill before production release; legacy CRM mode should be retired through a separate approved cutover after migration.

## Change gates
- Feature gates remain OFF by default in production; do not promote an unverified Preview or merge PR #65/#64.
- A build-only CI green is necessary but not sufficient.
- Preview shall be protected and use a nonproduction DB role with restricted privileges, no production credentials for active E2E runs.
- Apply only additive schema migrations to QA first, with transaction-level verification; confirm current snapshot, point-in-time recovery and grants before any production migration.
- Record exactly which commit, config, DB branch and QA data were used. Keep an explicit rollback procedure and owner approval.

## Test matrix
| Surface | Positive | Negative | Failure | Evidence needed |
| --- | --- | --- | --- | --- |
| CRM session | Login, two independently revocable sessions | Bad PIN, replayed token, blocked origin | Neon unreachable -> 503, no legacy bypass | Authenticated QA HTTP logs, sanitized |
| CRM write actions | Authorized update and persistence | Revoked session denied | DB timeout -> no unsafe mutation | QA row checks |
| WhatsApp | Authenticated provider message arrives once | Tampered, spoofed, oversized | Provider retry, DB failure | Provider sample + sanitized request IDs |
| Telnyx | Signed real event -> one prospect | Invalid signature, stale timestamp, duplicate | Alert failure not data loss | Provider event delivery + QA DB counts |
| POS | Valid login, tenant-specific catalog and order | Tenant cross-read, invalid cookie | DB unavailable -> fail closed | Full E2E run with isolated QA |
| Release | Canary/preview + rollback rehearsal | Disallowed direct production deploy | Restore from known snapshot | Runbook and post-change checks |

## Specific security issues to review before promotion
- Current rate limiting in CRM v2 relies on x-vercel-forwarded-for and keying by IP. Validate proxy trust and NAT/shared-user lockouts. Consider per-account plus per-IP controls.
- Legacy CRM mode still uses a deterministic shared PIN-derived cookie; keep exposure minimal and replace during a controlled cutover.
- Default preview environment may be wired to production DATABASE_URL: this is a potential high-impact isolation problem until verified, and must not be assumed safe.
- WhatsApp dualhook-managed validates metadata shape only and is not sufficient ingress authentication.
- Verify whether endpoint callback retries are prevented from causing duplicate external actions, not merely duplicate rows.
- Confirm rate limiter and session state handling under parallel requests and when DB is unavailable.
- Test signature validation on exact raw bytes; bound body size even when Content-Length absent.

## Sequence
1. Verify environment boundaries (read only).
2. Review PR #65 and #64 threat model and test gaps.
3. Build isolated QA backend and sanitized fixtures; do not copy live client datasets unnecessarily.
4. Run local unit / type / build and isolated integration / E2E.
5. Obtain provider-authentic samples and test webhook ingress in protected QA.
6. Perform rollback rehearsal.
7. Request explicit production release authorization and deploy in monitored stages.
