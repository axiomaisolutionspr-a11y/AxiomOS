# AxiomOS Autopilot — QA transactional consent + frequency integrated

**Date:** 2026-11-10. Scope QA only, no provider calls, no SMS/WhatsApp send, no production changes, no token/webhook edits.

## Before change
- PR #103 draft, branch `feature/axiomos-qa-policy-ci-isolated-20261110`.
- Neon QA child `br-soft-band-av98etp4`: 8 followups in needs_review (2 opt-out and 6 unknown consent); 5 historical campaign receipts marked accepted, **0** rows of contact-history coverage.
- A point-in-time Neon backup child `br-tiny-frost-avxoc3lj` (`qa-autopilot-frequency-backup-20261110`) was created from QA before applying migration.
- Existing transaction gate already failed closed for missing frequency source.

## Implemented
- SQL migration `database/migrations/20261110_qa_followup_frequency_gate_v2.sql` connects the conservative function `qa_contact_frequency_evidence` to `qa_audit_followup_transaction`, keeping checks for row-level queue lock, latest consent, human review, schedule, and local business hours.
- New blocking outcomes: `BLOCKED_NO_FREQUENCY_SOURCE` (unknown/incomplete/outdated history), `BLOCKED_FREQUENCY_24H` (one or more contacts in preceding 24h), `BLOCKED_FREQUENCY_7D` (two or more in preceding 7d), and `BLOCKED_NO_SUPPRESSION_SOURCE` (coverage seems complete but no cross-channel suppression proof). **No outcome can grant approval or send.**
- PostgreSQL integration script `scripts/test-qa-followup-frequency-integration-postgres.sh` tests missing coverage, synthetic complete coverage, 24-hour/7-day counters including uncertain attempts, opt-out, quiet hours, no suppression source, and no direct privileges.
- Earlier test failure from an existing synthetic campaign receipt was addressed by isolating a distinct synthetic prospect and queue. No production fixtures modified.

## Evidence
- GitHub Actions `AxiomOS QA transactional outbox` run **42913243224** succeeded with `QA_FREQUENCY_GATED_FOLLOWUP_TRANSACTION_NO_SEND_PASS`.
- Migration applied in QA Neon child `br-soft-band-av98etp4` after verifying the old function was not already upgraded.
- One QA audit of all 8 followups returned **8 BLOCKED_NO_CONSENT**. Audit table contains **16** rows total (8 from prior audit + 8 from current test); queue has **0 approved**.
- QA contact history **5 accepted marketing attempts**, coverage **0**, and the `followup_queue_no_live_dispatch` constraint remains present. Lector `axiomos_commercial_reader` cannot execute transactional audit.
- **No additional SMS, WhatsApp, provider operations, production changes, or credentials rotated.**

## Boundary
The proof applies to fail-closed transaction audit in QA, not to a deployed autonomous worker. Complete, verified frequency provenance and global suppression evidence are not available. Do not promote to production, merge as send-enabled, or remove protective constraints. WhatsApp Meta end-to-end webhook certification with independently isolated QA credentials/number remains pending.

**Decision:** QA_TRANSACTIONAL_FREQUENCY_INTEGRATION_PASS; AUTONOMOUS_CUSTOMER_DISPATCH_NO_GO.
