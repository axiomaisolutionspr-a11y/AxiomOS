# AxiomOS CRM v2 — isolated Neon SQL evidence

Date: 2026-11-03. Scope: isolated QA only.
Project: icy-field-92690259. Branch: br-floral-bonus-av79kbh4. Database: axiomos_security_qa.
Role: axiomos_security_qa_app (restricted DML grant on the two CRM auth tables).

## Executed
Using Neon's SQL transaction executor with **explicit branch_id, database_name and role_name**, on the isolated QA database only:
- insert deterministic synthetic hash into crm_admin_sessions: success;
- query active status: active_before=1;
- revoke with UPDATE ... SET revoked_at=NOW(): one row updated;
- query active status again: active_after=0;
- write synthetic auth attempt to crm_auth_attempts: attempts=1.

The artificial test hash is not a login token and was never exposed to the application.
These tests DO NOT certify a browser cookie, rate limiting at the HTTP layer, timeout handling, real WhatsApp deliveries, or production readiness.

## Readiness notes
- Latest verified GitHub security CI run at prior commit a7e083c: #19 succeeded.
- Preview for a7e083c was READY.
- Vercel branch-scoped Preview DATABASE_URL is configured as sensitive for security/crm-webhooks-hardening-20261103.
- Additional runtime proof of actual Preview connection target, protected E2E and safe synthetic fixtures is needed.
- The QA database contains only crm_admin_sessions and crm_auth_attempts. No CRM production data copied.
- Keep PR #65 as draft and feature flags off in production.
