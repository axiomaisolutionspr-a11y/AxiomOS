# AxiomOS HTTP negative E2E — verified results and remaining gaps
Date: 2026-11-03 AST / 2026-11-04 UTC.
Commit tested: 43334ab988625b5db82bcb0e41174552cee2dccf.
GitHub Actions security QA run: 41753836562 (completed SUCCESS).

## Real Next.js HTTP response evidence
- crmOrigin: 403
- crmWrongPinNoDatabase: 403 (origin gate fires first; **not** proof of database failure logic)
- crmOversized: 403 (origin gate fires first; **not** proof of the request size guard)
- crmUnauthorizedPage: 307
- metaUnsigned: 401
- telnyxUnsigned: 401
- whatsappTooLarge: 413

All requests used synthetic payloads and intentionally omitted provider and production database credentials. No business webhook event was processed.

## Important gaps
1. Investigate why the local CRM route comparison sees client Origin as mismatched. Use explicit trusted Host handling without weakening CSRF; then assert 503 on missing QA database and 413 for oversized body separately.
2. Run valid CRM login/session/logout/reuse with QA-only secrets and a synthetic full CRM fixture database.
3. Run POS authentication/order/replay isolated against POS branch. The current PR #64 fixture setup and secret injection are not certified.
4. Webhook provider actual signature and delivery verification, including Dualhook ingress origin authentication, still require provider setup.
5. npm ci reported 23 dependency advisories (16 moderate, 6 high, 1 critical) on this run. Review via npm audit --json without auto-upgrading and prioritize exploitable production dependencies. Do not run npm audit fix --force without compatibility tests.

## Gate
Only negative HTTP route behavior and existing isolated unit/SQL checks are confirmed. Neither production release nor payment activation is approved by this report.
