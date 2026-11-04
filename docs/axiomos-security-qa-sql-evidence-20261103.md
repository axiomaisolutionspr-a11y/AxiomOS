# AxiomOS CRM v2 — isolated security QA evidence and runbook

Date: 2026-11-04. Scope: isolated QA only. Production is not enabled or modified.

## Fixed resources

- Neon project: `icy-field-92690259`
- Neon branch: `br-floral-bonus-av79kbh4` (`axiomos-security-integration-qa-20261103`)
- Database: `axiomos_security_qa`
- Runtime role: `axiomos_security_qa_runtime`
- Independently pinned host: `ep-wandering-recipe-avweoa3b-pooler.c-11.us-east-1.aws.neon.tech`
- Git branch: `security/crm-webhooks-hardening-20261103`
- Pull request: #65 (keep as draft until all external-provider evidence exists)
- GitHub environment for the protected E2E: `axiomos-qa`

The QA database contains only `crm_admin_sessions` and `crm_auth_attempts`. It contains no copied leads, customers, payment records, or production fixtures.

## Least-privilege correction

The earlier role `axiomos_security_qa_app` was found to have Neon administrative attributes and must not be used by the application or CI.

The replacement role `axiomos_security_qa_runtime` is pinned in the E2E harness. Runtime verification must prove all of these are false before the test server starts:

- `rolsuper`
- `rolcreaterole`
- `rolcreatedb`
- `rolreplication`
- `rolbypassrls`

Its table grants are limited to SELECT, INSERT, UPDATE and DELETE on the two isolated authentication tables.

## Preview configuration

Vercel Preview variables are branch-scoped to `security/crm-webhooks-hardening-20261103`:

- `DATABASE_URL`: sensitive URL for the least-privilege QA role
- `AXIOMOS_CRM_ACCESS_PIN`: synthetic sensitive QA value
- `AXIOMOS_CRM_RATE_LIMIT_SECRET`: synthetic sensitive QA value
- `AXIOMOS_CRM_SESSION_V2_ENABLED=true`
- `AXIOMOS_TELNYX_SIGNATURE_REQUIRED=false`
- `AXIOMOS_WHATSAPP_WEBHOOK_AUTH_MODE=off`

Never copy the QA connection or synthetic PIN to Production.

## One-click authenticated E2E

The protected workflow on `main` is `CRM security isolated QA E2E`. It checks out an exact reviewed feature commit rather than an unpinned branch.

The workflow requires one GitHub environment secret:

- `CRM_QA_DATABASE_URL`: connection for `axiomos_security_qa_runtime` to `axiomos_security_qa`

It also independently pins `CRM_QA_DATABASE_HOST` in workflow source. The E2E refuses any other user, host, database, missing TLS, or elevated runtime role.

The test runs the production Next.js build and proves:

1. unauthenticated session status returns 401;
2. an unauthenticated protected `/prospectos/*` request redirects to access;
3. missing and foreign origins are rejected;
4. malformed and oversized login bodies are rejected;
5. five incorrect PINs are allowed and subsequent attempts return 429;
6. a valid login creates an opaque, HttpOnly, Secure, SameSite=Strict v2 cookie;
7. the cookie passes the protected-route middleware and the Neon session lookup;
8. a logout without Origin is rejected without revoking the session;
9. a valid logout revokes the server-side session;
10. replay of the old cookie fails in both the session API and middleware;
11. a fresh login creates a different valid session while the old one stays dead;
12. all synthetic database rows are removed before success.

Required terminal marker:

`CRM_SECURITY_QA_E2E_SUCCESS { ... }`

No marker means no certification.

## Provider-auth boundary

Unit and negative HTTP tests prove Meta HMAC and Telnyx Ed25519 verification logic with synthetic cryptographic material. That is not a real-provider certification.

Keep both provider gates disabled until a genuine signed event is captured and accepted in QA:

- Meta direct: requires `WHATSAPP_META_APP_SECRET` and a real `x-hub-signature-256`.
- Telnyx: requires `TELNYX_PUBLIC_KEY` and a real fresh Ed25519 delivery.
- Dualhook-managed mode currently validates expected WABA and phone IDs but is not cryptographic authentication because the provider owns the Meta app secret.

Production remains unchanged until that external evidence is available and PR #65 is deliberately reviewed.
