-- AxiomOS — contador mensual de preguntas a Brain (asistente del dueño).
-- Aditiva e idempotente. Una fila por negocio y mes (hora de Puerto Rico).
-- Probar primero en una rama Neon de QA. No aplicar a producción sin autorización.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() NOT IN ('neondb', 'axiomos_offers_qa') THEN
    RAISE EXCEPTION 'Base no autorizada para esta migración: %', current_database();
  END IF;
END
$$;
CREATE SCHEMA IF NOT EXISTS axiomos_commercial;
REVOKE ALL ON SCHEMA axiomos_commercial FROM PUBLIC;

CREATE TABLE IF NOT EXISTS axiomos_commercial.brain_usage (
  tenant_id TEXT NOT NULL CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  period CHAR(7) NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  questions INTEGER NOT NULL DEFAULT 0 CHECK (questions >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id, period)
);
REVOKE ALL ON axiomos_commercial.brain_usage FROM PUBLIC;
ALTER TABLE axiomos_commercial.brain_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.brain_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brain_usage_tenant ON axiomos_commercial.brain_usage;
CREATE POLICY brain_usage_tenant ON axiomos_commercial.brain_usage
  USING (tenant_id = current_setting('axiomos.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('axiomos.tenant_id', true));

-- Permisos para los roles que ya existan (producción o QA). No crea roles ni contraseñas.
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_reader', 'axiomos_offers_qa_reader'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA axiomos_commercial TO %I', r);
      EXECUTE format('GRANT SELECT ON axiomos_commercial.brain_usage TO %I', r);
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_writer', 'axiomos_autopilot_qa_offer_writer'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA axiomos_commercial TO %I', r);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE (questions, updated_at) ON axiomos_commercial.brain_usage TO %I', r);
    END IF;
  END LOOP;
END
$$;
COMMIT;
