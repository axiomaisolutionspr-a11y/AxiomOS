-- QA-only consent/opt-out evidence ledger; all sends remain prohibited.
REVOKE ALL PRIVILEGES ON axiomos_commercial.followup_review_dashboard FROM axiomos_commercial_writer;
GRANT SELECT ON axiomos_commercial.followup_review_dashboard TO axiomos_commercial_writer;
CREATE TABLE axiomos_commercial.followup_contact_permissions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id text NOT NULL DEFAULT 'axiomai' CHECK (tenant_id='axiomai'),
 prospect_id bigint NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK(channel IN ('whatsapp','sms','email','phone')),
 purpose text NOT NULL CHECK(purpose IN ('followup','appointment_reminder')),
 permission_state text NOT NULL CHECK(permission_state IN ('opt_in','opt_out','unknown')),
 evidence_source text NOT NULL CHECK (length(btrim(evidence_source)) BETWEEN 3 AND 250),
 recorded_by uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 UNIQUE (tenant_id,prospect_id,channel,purpose,recorded_at)
);
REVOKE ALL PRIVILEGES ON axiomos_commercial.followup_contact_permissions FROM axiomos_commercial_reader,axiomos_commercial_writer;
CREATE VIEW axiomos_commercial.followup_eligibility WITH (security_barrier=true) AS
 SELECT q.tenant_id,q.id::text AS item_id,
 CASE WHEN latest.permission_state='opt_out' THEN 'blocked_opt_out'
 WHEN latest.permission_state='opt_in' THEN 'consent_recorded_requires_review'
 ELSE 'blocked_no_consent' END AS eligibility,
 COALESCE(latest.permission_state,'unknown') AS permission_state
 FROM axiomos_commercial.followup_queue q
 LEFT JOIN LATERAL (SELECT permission_state FROM axiomos_commercial.followup_contact_permissions c
 WHERE c.tenant_id=q.tenant_id AND c.prospect_id=q.prospect_id AND c.channel=q.channel AND c.purpose=q.purpose
 ORDER BY recorded_at DESC,id DESC LIMIT 1) latest ON true
 WHERE q.tenant_id='axiomai';
GRANT SELECT ON axiomos_commercial.followup_eligibility TO axiomos_commercial_reader,axiomos_commercial_writer;
-- Even opt_in cannot send: followup_queue_no_live_dispatch remains enforced.
