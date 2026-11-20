-- Brain: asistente de IA del dueño dentro del CRM, con límite mensual de preguntas por plan
-- y paquetes adicionales. Migración ADITIVA e idempotente. Requiere 20261119_axiomos_catalog_v2.sql.
-- Privacidad: no se guarda el texto de las preguntas ni de las respuestas; solo el conteo y el tipo.
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

-- Plan del negocio para Brain y paquetes mensuales activos (cada paquete suma las preguntas del
-- complemento "paquete-preguntas-brain" del catálogo publicado).
CREATE TABLE IF NOT EXISTS axiomos_commercial.brain_accounts (
  tenant_id TEXT PRIMARY KEY CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  plan_key TEXT NOT NULL DEFAULT 'axiomos-gratis' CHECK (plan_key ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  addon_packs SMALLINT NOT NULL DEFAULT 0 CHECK (addon_packs BETWEEN 0 AND 50),
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

-- Preguntas usadas por mes (mes en hora de Puerto Rico, formato AAAA-MM).
CREATE TABLE IF NOT EXISTS axiomos_commercial.brain_usage (
  tenant_id TEXT NOT NULL CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id, period)
);

-- Solicitudes de paquete adicional. Sin pasarela de pagos conectada, quedan "pending" hasta que
-- AxiomAI confirme el cobro; solo entonces se activan.
CREATE TABLE IF NOT EXISTS axiomos_commercial.brain_purchases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  item_key TEXT NOT NULL,
  item_version INTEGER NOT NULL,
  questions INTEGER NOT NULL CHECK (questions > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  note VARCHAR(200) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS brain_purchases_lookup ON axiomos_commercial.brain_purchases (tenant_id, requested_at DESC);

-- Registro de uso sin contenido: quién, cuándo y de dónde salió la respuesta.
CREATE TABLE IF NOT EXISTS axiomos_commercial.brain_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  period TEXT NOT NULL,
  answer_source TEXT NOT NULL CHECK (answer_source IN ('data', 'catalog', 'knowledge', 'ai', 'help', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX IF NOT EXISTS brain_log_lookup ON axiomos_commercial.brain_log (tenant_id, created_at DESC);

REVOKE ALL ON axiomos_commercial.brain_accounts, axiomos_commercial.brain_usage,
  axiomos_commercial.brain_purchases, axiomos_commercial.brain_log FROM PUBLIC;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['brain_accounts', 'brain_usage', 'brain_purchases', 'brain_log'] LOOP
    EXECUTE format('ALTER TABLE axiomos_commercial.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE axiomos_commercial.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON axiomos_commercial.%I', t || '_tenant', t);
    EXECUTE format('CREATE POLICY %I ON axiomos_commercial.%I USING (tenant_id = current_setting(''axiomos.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''axiomos.tenant_id'', true))', t || '_tenant', t);
  END LOOP;
END
$$;

-- El registro solo admite inserciones.
DROP TRIGGER IF EXISTS brain_log_append_only ON axiomos_commercial.brain_log;
CREATE TRIGGER brain_log_append_only BEFORE UPDATE OR DELETE ON axiomos_commercial.brain_log
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.audit_append_only();

DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_reader', 'axiomos_offers_qa_reader'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT ON axiomos_commercial.brain_accounts, axiomos_commercial.brain_usage, axiomos_commercial.brain_purchases TO %I', r);
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_writer', 'axiomos_autopilot_qa_offer_writer'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT SELECT, INSERT ON axiomos_commercial.brain_accounts, axiomos_commercial.brain_usage, axiomos_commercial.brain_purchases, axiomos_commercial.brain_log TO %I', r);
      EXECUTE format('GRANT UPDATE (plan_key, addon_packs, updated_by, updated_at) ON axiomos_commercial.brain_accounts TO %I', r);
      EXECUTE format('GRANT UPDATE (used, updated_at) ON axiomos_commercial.brain_usage TO %I', r);
      EXECUTE format('GRANT UPDATE (status, confirmed_by, confirmed_at, note) ON axiomos_commercial.brain_purchases TO %I', r);
      EXECUTE format('GRANT USAGE ON ALL SEQUENCES IN SCHEMA axiomos_commercial TO %I', r);
    END IF;
  END LOOP;
END
$$;
COMMIT;
