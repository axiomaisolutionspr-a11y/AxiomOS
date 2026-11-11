-- Read-only summary for the existing commercial WhatsApp follow-up queue.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

CREATE OR REPLACE VIEW axiomos_commercial.whatsapp_followup_readiness
WITH (security_barrier = true) AS
SELECT readiness, count(*)::integer AS total
FROM (
  SELECT CASE
    WHEN q.status <> 'needs_review' OR d.decision = 'blocked' THEN 'blocked_review'
    WHEN e.permission_state = 'opt_out' THEN 'opted_out'
    WHEN e.permission_state IS DISTINCT FROM 'opt_in' THEN 'no_consent'
    WHEN p.crm_stage IS NULL OR p.crm_stage NOT IN ('Seguimiento', 'Interesado')
      OR p.follow_up_at IS NULL THEN 'inactive_followup'
    WHEN q.scheduled_for > statement_timestamp() OR p.follow_up_at > statement_timestamp()
      THEN 'scheduled'
    WHEN coalesce(p.caller_phone, '') !~ '^[+0-9 ().-]+$'
      OR regexp_replace(p.caller_phone, '[^0-9]', '', 'g')
        !~ '^(1?(787|939)[0-9]{7}|[1-9][0-9]{10,14})$' THEN 'no_valid_phone'
    WHEN d.decision = 'reviewed_only' THEN 'reviewed'
    ELSE 'awaiting_review'
  END AS readiness
  FROM axiomos_commercial.followup_queue q
  JOIN public.prospects p ON p.id = q.prospect_id
  LEFT JOIN axiomos_commercial.followup_eligibility e
    ON e.tenant_id = q.tenant_id AND e.item_id = q.id::text
  LEFT JOIN axiomos_commercial.followup_review_decisions d
    ON d.tenant_id = q.tenant_id AND d.queue_id = q.id
  WHERE q.tenant_id = 'axiomai' AND q.channel = 'whatsapp' AND q.purpose = 'followup'
) classified
GROUP BY readiness;

REVOKE ALL ON axiomos_commercial.whatsapp_followup_readiness FROM PUBLIC;
GRANT SELECT ON axiomos_commercial.whatsapp_followup_readiness TO axiomos_commercial_reader;
COMMIT;
