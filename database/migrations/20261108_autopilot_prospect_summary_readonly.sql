-- AxiomOS aggregate-only prospect metrics; validated on isolated Neon QA branch.
-- Do not grant SELECT on public.prospects to the commercial reader.
CREATE VIEW axiomos_commercial.legacy_prospect_summary WITH (security_barrier = true) AS
SELECT COUNT(*)::int AS total,
COUNT(*) FILTER (WHERE crm_stage = 'Nuevo')::int AS new_count,
COUNT(*) FILTER (WHERE crm_stage = 'Interesado')::int AS interested_count,
COUNT(*) FILTER (WHERE crm_stage = 'Seguimiento')::int AS followup_count,
COUNT(*) FILTER (WHERE crm_stage = 'Perdido')::int AS lost_count,
COUNT(*) FILTER (WHERE follow_up_at IS NOT NULL AND follow_up_at < statement_timestamp())::int AS overdue_count,
COUNT(*) FILTER (WHERE follow_up_at >= statement_timestamp() AND follow_up_at < statement_timestamp() + INTERVAL '7 days')::int AS due_next_7_days,
COUNT(*) FILTER (WHERE crm_notes IS NOT NULL AND btrim(crm_notes) <> '')::int AS with_notes,
COUNT(*) FILTER (WHERE assigned_to IS NULL OR btrim(assigned_to) = '')::int AS unassigned
FROM public.prospects;
GRANT SELECT ON axiomos_commercial.legacy_prospect_summary TO axiomos_commercial_reader;
-- Feature flag AXIOMOS_AUTOPILOT_PROSPECT_SUMMARY_ENABLED defaults off.
