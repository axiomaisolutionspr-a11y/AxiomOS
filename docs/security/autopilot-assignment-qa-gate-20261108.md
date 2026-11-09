# QA Security Gate — Autopilot assignments (2026-11-08)

Status: **NOT CERTIFIED — DO NOT ENABLE IN PRODUCTION**

## Actual verified tests
- Vercel Preview build READY: dpl_F9anUBUbLovFh6wo1Pqvz8wrEJNk.
- Neon QA br-dry-wildflower-av6zmdk7: 33 original prospects; only isolated assignment table was modified.
- Role-specific function attempt with operator UUID as actor returned 0 rows.
- Valid owner request advanced revision (1→2); stale/replayed requests returned 0 rows.
- Direct writer table INSERT privilege = false. Function EXECUTE privilege = true.
- **Critical negative test failed**: using the scoped writer credential with an arbitrary owner's UUID in the p_actor parameter, the function accepted the call and advanced assignment revision (2→3). It recorded an audit row attributing the action to the supplied UUID, not necessarily the authenticated human.

## Root cause
The SECURITY DEFINER function trusts p_actor supplied by its caller. Checking that the supplied UUID has an owner membership does not authenticate its caller. Therefore database-level claims of actor authentication are invalid. The Next.js server action obtains a verified Neon Auth session and calls the function, but a leaked/misused writer credential could impersonate owner and forge audit attribution.

## Release blockers
1. Replace caller-controlled actor identity with verifiable provenance. A robust option is signed, short-lived action claims verified inside Postgres against a separately managed secret, bound to actor, subject, operation, revision, expiration, and anti-replay nonce, with atomic nonce consumption. Alternatively use verified session context through a trusted gateway that cannot be arbitrarily set by the SQL caller.
2. Confirm write privileges are restricted, and add negative tests for spoofed owner, replay, stale revision, blocked operator, invalid membership, inactive account, duplicate insert, audit atomicity.
3. Implement authenticated HTTP/server-action E2E with genuine owner and operator sessions, plus sign-out/session revocation.
4. The feature flag `AXIOMOS_AUTOPILOT_ASSIGNMENTS_ENABLED` must remain absent/false. Keep PR #89 draft; no migrations or assignments to production until gates pass.

No WhatsApp/SMS/call sends should be enabled.

## Mitigation added in PR #89 (QA re-test, 2026-11-08)
- Revoked EXECUTE on legacy `assign_followup(bigint,uuid,uuid,integer)` from commercial writer.
- Added HMAC-SHA256 signed, one-time claim to `assign_followup_signed`: binds actor UUID, prospect ID, assignee UUID, optimistic revision, expiration epoch, and UUID nonce.
- Secret stored in database owner-only configuration, not readable by scoped commercial writer. Separate matching server environment secret is required for deployment; none was installed in production.
- Signed claim is issued only by the authenticated Next.js server action after verifying active owner membership. SHA256 signature is checked by the SQL SECURITY DEFINER function; nonce is single use and assignment/audit commit atomically.
- Verified in Neon QA: valid claim advanced revision once; replay returned zero rows; forged signature returned zero rows; validly signed operator claim returned zero rows; expired claim returned zero rows. Invalid requests left audit count and revision unchanged, with 33 prospects still present.
- **Remaining release gate**: configure production secret independently, validate actual authenticated owner/operator HTTP E2E and sign-out/revocation; PR stays draft and feature flag OFF.
