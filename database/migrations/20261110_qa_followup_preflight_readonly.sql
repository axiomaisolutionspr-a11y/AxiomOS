-- AxiomOS: QA CHILD BRANCH ONLY. Do not apply to production.
-- Owner-only migration. Exposes only non-PII follow-up decision metadata.
-- Base tables remain inaccessible to restricted database roles.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $$
BEGIN
  IF current_database() <> 'neondb' THEN RAISE EXCEPTION 'QA neondb only'; END IF;
  IF session_user <> 'neondb_owner' THEN RAISE EXCEPTION 'Neon owner required'; END IF;
END $$;

CREATE VIEW axiomos_commercial.qa_followup_preflight_readonly
WITH (security_barrier=true) AS
SELECT q.id::text AS queue_id,
       q.tenant_id, q.channel, q.purpose, q.status, q.scheduled_for,
       c.permission_state, c.recorded_at AS permission_recorded_at,
       (c.evidence_source IS NOT NULL AND length(btrim(c.evidence_source)) >= 3) AS has_evidence,
       d.decision AS review_decision
FROM axiomos_commercial.followup_queue q
LEFT JOIN LATERAL (
 SELECT p.permission_state, p.recorded_at, p.evidence_source
 FROM axiomos_commercial.followup_contact_permissions p
 WHERE p.tenant_id=q.tenant_id AND p.prospect_id=q.prospect_id
   AND p.channel=q.channel AND p.purpose=q.purpose
 ORDER BY p.recorded_at DESC,p.id DESC LIMIT 1
) c ON true
LEFT JOIN axiomos_commercial.followup_review_decisions d
  ON d.tenant_id=q.tenant_id AND d.queue_id=q.id
WHERE q.tenant_id='axiomai' AND q.status IN ('needs_review','blocked','cancelled');

REVOKE ALL ON axiomos_commercial.qa_followup_preflight_readonly
 FROM PUBLIC, axiomos_commercial_writer, axiomos_commercial_reader;
GRANT SELECT ON axiomos_commercial.qa_followup_preflight_readonly
 TO axiomos_commercial_reader;
-- No inserts, updates, deletes, writes, dispatch or external-provider calls.
COMMIT;
