-- QA only. Explicitly prohibits approved status and has no provider dispatch.
-- Use a nonproduction Neon branch. The original CRM tables are never modified.
CREATE TABLE axiomos_commercial.followup_queue (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL DEFAULT 'axiomai',
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email','phone')),
 purpose text NOT NULL CHECK (purpose IN ('followup','appointment_reminder')),
 scheduled_for timestamptz NOT NULL,
 dedupe_key text NOT NULL,
 draft_body text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review','blocked','approved','cancelled')),
 consent_source text,
 consent_verified_at timestamptz,
 approved_by uuid,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 CONSTRAINT followup_queue_unique_dedupe UNIQUE(tenant_id,dedupe_key),
 CONSTRAINT followup_queue_review_guard CHECK (
   status <> 'approved' OR (consent_source IS NOT NULL AND btrim(consent_source) <> '' AND consent_verified_at IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
 ),
 CONSTRAINT followup_queue_no_live_dispatch CHECK(status <> 'approved')
);
-- Intentionally no GRANT to web roles and no send worker.
