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

-- Restrict inherited/default ACLs: raw queue contains message bodies and consent metadata.
REVOKE ALL PRIVILEGES ON axiomos_commercial.followup_queue FROM axiomos_commercial_reader, axiomos_commercial_writer;
CREATE VIEW axiomos_commercial.followup_review_dashboard WITH (security_barrier = true) AS
 SELECT tenant_id, id::text AS item_id, prospect_id::text AS prospect_ref, channel, purpose, status,
 TO_CHAR(scheduled_for AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS scheduled_for,
 CASE WHEN status='needs_review' THEN 'Revisión humana y consentimiento pendiente'
 WHEN status='blocked' THEN 'Bloqueado' WHEN status='cancelled' THEN 'Cancelado'
 ELSE 'No elegible' END AS review_reason
 FROM axiomos_commercial.followup_queue
 WHERE tenant_id='axiomai' AND status IN ('needs_review','blocked','cancelled');
GRANT SELECT ON axiomos_commercial.followup_review_dashboard TO axiomos_commercial_reader;
-- Never grant read or write to the underlying queue; do not expose draft_body or consent metadata in the view.
