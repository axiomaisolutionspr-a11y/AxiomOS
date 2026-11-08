# AxiomOS Commercial Truth Engine — deployment gate (2026-11-08)

This release is **prepared, not activated**. It is scoped to AxiomAI Solutions (`tenant_id = 'axiomai'`). The existing CRM PIN, leads, WhatsApp, Messenger, Instagram, and Telnyx routes are not migrated by this release. The project is not yet a multi-tenant SaaS.

## Verified

- Production main before this candidate: `b3736237ba964d1e6258e566e92d1d18bce58a49`. Earlier price guard is live and refuses to invent prices when the catalog is unavailable.
- Neon production backup branch `br-patient-cake-avtv0igt` was ready before the Auth provisioning. Preserve it. Restoring the entire branch later would replace subsequent live data; use a targeted rollback first.
- Catalog SQL on PGlite: creation, approval, overlap exclusion, channel scope, pause, audit, expiration. Auth membership: absent/disabled users fail closed. The focused suite including `tests/commercial-brain-http.test.mjs` passes 16/16, `npm run build` passes, and ESLint passes for the changed application and test files. Repository-wide lint still reports errors in older unrelated files.
- Neon production child branch `br-rapid-night-avl1tcfi` passed both additive migrations. Schema comparison with `main` showed 235 added lines, zero removed lines and no changes to legacy CRM tables. Prospect/call/WhatsApp counts matched at 33/20/162; offers and memberships started empty; RLS is enabled. Synthetic QA approval produced one active Web offer and no Instagram offer; overlapping approval failed with SQLSTATE 23P01. PostgreSQL privilege inspection of non-login test roles confirmed SELECT for the reader on offers and memberships but no UPDATE or legacy prospect access; the writer can INSERT offers but has no DELETE, membership SELECT, or legacy prospect SELECT. No synthetic offer was sent to a customer.
- Neon Auth on production branch `br-square-field-avmxjhvf` exists with public sign-up disabled, OTP verification and trusted canonical domains; **its email provider is still shared Neon SMTP**.
- The commercial flag and dedicated credentials are absent in the production Vercel project. Consequently the new catalog and login fail closed.

## Release order

1. Configure and verify a domain-owned transactional email provider in production Neon Auth. Verify a test email to Rolando's authorized address. This connector cannot set SMTP. Do not enable sign-in or claim delivery before this step.
2. Completed: the owner authorized removal of the unused `axiomos-security-integration-qa-20261103` branch, and both migrations were tested on the fresh child branch `br-rapid-night-avl1tcfi`. Preserve this branch for review until production readiness is demonstrated; do not reuse it as a production backup.
3. Take and verify a new point-in-time production backup immediately before migration. Apply `database/migrations/20261108_axiomos_identity_v1.sql` and `20261108_axiomos_commercial_v1.sql` only after the child-branch test. Both are additive and do not touch legacy CRM tables.
4. Create separate least-privilege `axiomos_commercial_reader` and `axiomos_commercial_writer` Postgres roles. Grant the reader only `USAGE` on both new schemas and `SELECT` on offers/audit/memberships; grant writer only `USAGE` on commercial schema/sequence and `SELECT, INSERT, UPDATE` on offers plus `SELECT, INSERT` on audit. Never grant legacy lead or auth-system tables. Test permitted and denied queries with those exact credentials.
5. Register Rolando and Alex using their authorized addresses with Neon Auth. Bind their actual Auth UUIDs to `axiomos_identity.memberships` as owner and operator respectively. Validate session revocation, disabled membership, cross-account denial, OTP and sign-out. The catalog writer is owner only.
6. Set **production-only** Vercel secrets `AXIOMOS_COMMERCIAL_DATABASE_URL`, `AXIOMOS_COMMERCIAL_WRITER_URL`, `AXIOMOS_COMMERCIAL_DATABASE_HOST`, `AXIOMOS_COMMERCIAL_AUTH_BASE_URL`, `AXIOMOS_COMMERCIAL_AUTH_HOST`, `AXIOMOS_COMMERCIAL_COOKIE_SECRET`. The first two must be dedicated roles and the host must match the production Neon host. Set `AXIOMOS_COMMERCIAL_ENABLED=true` last; redeploy only after all prior checks. Never put QA or a legacy superuser connection string in these variables.
7. Use a verified real, approved offer with dates, tax, activation, term and channels. Exercise Web and approved test accounts on WhatsApp/Messenger/Instagram with no unsolicited sends, confirming active/expired/paused and wrong-channel behavior. The voice assistant is outside this catalog path and must remain excluded from commercial price claims until separately integrated and tested.
8. Check Vercel logs for `AXIRA_OFFERS_READ_FAILED`, baseline lead counts, and current webhooks. If errors occur, remove the flag and redeploy. This returns to the already live price-verification fallback without dropping data or changing channel credentials.

## Limits

- No real offer is seeded by this change. No sales data, customer conversation, or tenant-specific CRM state is connected to this dashboard.
- Auto-expiration is enforced at query time and needs no cron job. Overlapping approved periods per service are blocked by PostgreSQL.
- A customer maximum is an advertised limit only; actual availability still needs a reliable integration.
- The model never approves new prices. Only an authenticated owner can approve a catalog revision, independently of the model.
- Production enablement is gated by successful Neon child-branch migration, custom email delivery, least-privilege credentials, actual owner membership, and a live end-to-end test.
