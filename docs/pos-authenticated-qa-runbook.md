# AxiomOS POS authenticated E2E — QA instructions
**No production access or real payments.**

## Confirmed QA data
- Neon project: `icy-field-92690259`.
- Branch: `pos-http-e2e-qa-20261103` (`br-aged-rice-avymo2s8`).
- Database: `neondb`.
- Restricted role: `pos_qa_app_login`.
- Direct host: `ep-sweet-base-avnvvgcd.c-11.us-east-1.aws.neon.tech`.
- Synthetic merchant, operator, `QA-SKU`, and active station are present.

## Protected setup
1. Use the GitHub environment `axiomos-qa`, restricted to `main`, because the manual dispatcher is stored on `main`.
2. Add `POS_QA_DATABASE_URL` as an environment secret, using the direct, non-pooled connection for the QA branch, database, and restricted role above.
3. The dispatcher must pin an independently reviewed commit from `feature/pos-qa-session-revocation-20261103`; do not check out a moving branch tip.
4. Never use Neon `main`, `neondb_owner`, a pooled host, production credentials, or a global Vercel `DATABASE_URL`.
5. Never print the connection string, password, session cookie, or generated credentials.

## Run and certify
Open **Actions > POS isolated QA authenticated E2E**, run from `main`, and inspect the `e2e` job.

Only certify when:
- the checkout log identifies the intended pinned commit;
- secret preflight, `npm ci`, production audit, build, and HTTP E2E all pass;
- the log contains the exact marker `POS_QA_E2E_SUCCESS`;
- the GitHub conclusion is `success`.

A skipped job, missing secret, green build alone, preview deployment, or negative-only HTTP checks do not qualify.

The test generates a synthetic QA username, password, and session secret in the runner. It checks CSRF rejection, invalid credentials, valid login, cookie policy, active session, catalog, draft creation, idempotency, order listing, protected QA page, logout, server-side revocation, replay rejection, fresh login, and rate limiting. It never submits a payment.

## Certified execution — 2026-11-04
- GitHub run: `41823538491` (`POS isolated QA authenticated E2E #4`).
- Workflow commit on `main`: `291c47b626b3491e2d08230ffd37cb619ae5f9c1`.
- Tested feature commit: `985dcb0e1744d826936c6683467b8b8f34e5f30b`.
- Conclusion: `success`; duration: 1m 29s.
- Production dependency audit: 0 vulnerabilities.
- Marker: `POS_QA_E2E_SUCCESS`.

Verified HTTP outcomes:
- Guest session 401; missing/foreign Origin 403; wrong password 401.
- Valid login/session/catalog 200; draft and idempotent retry 201; same order returned.
- Order list and protected QA page 200.
- Logout 200; replayed session, catalog, order read, and write all 401.
- Fresh login/session 200; old session stayed revoked; second logout 200.
- Rate limit sequence: `401,401,401,401,401,429,429`.

The first authenticated execution exposed an Origin/Host normalization mismatch under local Next.js. Commit `985dcb0` fixed same-origin validation by comparing Origin with the incoming Host while preserving rejection of foreign origins. The complete suite then passed.

## Afterward
Keep production unchanged. Review synthetic QA orders and sessions before any cleanup. Cleanup requires explicit authorization.

## Separate unresolved tests
CRM positive sessions still require a dedicated isolated Neon E2E. Dualhook/Meta and Telnyx still require genuine provider-signed events. Synthetic signature unit tests do not certify those integrations.
