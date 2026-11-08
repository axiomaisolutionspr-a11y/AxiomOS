-- QA-tested. Do not apply until reviewed, with no marketing or outbound sending.
CREATE VIEW axiomos_commercial.legacy_followup_review WITH (security_barrier = true) AS
SELECT id::text AS prospect_id, crm_stage AS stage, follow_up_at AS due_at,
CASE WHEN follow_up_at < statement_timestamp() THEN 'overdue' ELSE 'upcoming' END AS priority
FROM public.prospects
WHERE follow_up_at IS NOT NULL AND crm_stage IN ('Interesado','Seguimiento')
ORDER BY follow_up_at ASC, id ASC LIMIT 50;
GRANT SELECT ON axiomos_commercial.legacy_followup_review TO axiomos_commercial_reader;
-- Reader must remain without SELECT / INSERT / UPDATE / DELETE on public.prospects.
-- AXIOMOS_AUTOPILOT_FOLLOWUP_REVIEW_ENABLED remains OFF until release verification.
