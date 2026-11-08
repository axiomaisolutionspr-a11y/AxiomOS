-- Apply after production approval and backup verification.
-- Aggregated count only; never grant access to public.prospects.
CREATE VIEW axiomos_commercial.legacy_prospect_count
  WITH (security_barrier = true)
AS SELECT count(*)::int AS total FROM public.prospects;
GRANT SELECT ON axiomos_commercial.legacy_prospect_count TO axiomos_commercial_reader;
-- AXIOMOS_AUTOPILOT_PROSPECTS_READ_ENABLED stays unset until verified deployment.
