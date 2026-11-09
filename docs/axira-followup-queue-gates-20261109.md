# AxiomAI / Axira: secure follow-up queue — Phase 1 (QA only)

Production CRM backup: `snap-patient-mode-avrvzaqk` (2026-11-09). QA Neon branch: `br-green-mouse-av20t9bx`.

## What is implemented
- Separate `axiomos_commercial.followup_queue` for references to existing prospect IDs; no writes to original `public.prospects`.
- `dedupe_key` unique within tenant. Replayed draft submission returns no new rows under ON CONFLICT DO NOTHING.
- Default status `needs_review`; `approved` prevented by explicit database CHECK regardless of application behavior.
- Approval metadata and consent evidence fields reserved for future audited release. No actual sending, scheduling worker, webhook calls, or CRM editing.
- No SELECT/INSERT/UPDATE/DELETE grant to the commercial dashboard reader/writer roles.
- QA verification: first insert => 1 needs_review; duplicate insert => 0 rows; approved = 0.

## Before any live dispatch
- Collect documented channel-specific, purpose-specific opt-in and opt-out history (including revocation); don't infer consent from presence of a phone number, prior conversation, or a previous campaign send.
- Enforce Meta WhatsApp business-initiated template requirements/24-hour policy, current provider restrictions, and applicable SMS/email rules.
- Implement per-recipient throttling, quiet hours in America/Puerto_Rico, unique provider idempotency keys, atomic claim/lock, status transitions and retry limits.
- Recheck contact suppression, consent, opt-outs, open conversation/service window, deduplication, and appointment context *at dispatch time*.
- Protect records by tenant and individual membership; only explicit owner-approved send policy can unblock; audit actor and time.
- Verify QA with synthetic messages and provider sandbox; real sends require separate approval. Maintain dry-run and emergency kill switch.
- Keep all new production flags OFF until authenticated E2E tests and audit pass.

This phase is groundwork, not an autonomous sending system.
