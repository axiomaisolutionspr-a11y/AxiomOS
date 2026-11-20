-- AxiomOS — Centro Comercial y Conocimiento de Axira (v2).
-- Aditiva: no modifica ni borra tablas existentes (offers/offer_audit siguen igual).
-- Versionado inmutable: cada cambio es una versión nueva; solo cambia el estado.
-- Multicliente: toda fila lleva tenant_id y RLS obliga a fijar axiomos.tenant_id
-- en la transacción (SELECT set_config('axiomos.tenant_id', $tenant, true)).
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

CREATE TABLE IF NOT EXISTS axiomos_commercial.catalog_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  item_key TEXT NOT NULL CHECK (item_key ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 100000),
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'service')),
  name VARCHAR(80) NOT NULL CHECK (length(btrim(name)) >= 3),
  summary VARCHAR(400) NOT NULL DEFAULT '',
  category VARCHAR(60) NOT NULL DEFAULT '',
  pricing_mode TEXT NOT NULL CHECK (pricing_mode IN ('fixed', 'quote')),
  currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  billing_period TEXT CHECK (billing_period IN ('month', 'year', 'one_time')),
  regular_cents INTEGER CHECK (regular_cents BETWEEN 0 AND 99999999),
  promo_cents INTEGER CHECK (promo_cents >= 0),
  promo_months SMALLINT CHECK (promo_months BETWEEN 1 AND 36),
  promo_valid_until TIMESTAMPTZ,
  users_included SMALLINT CHECK (users_included BETWEEN 1 AND 10000),
  limits JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(limits) = 'object'),
  benefits TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(benefits) <= 30 AND array_position(benefits, NULL) IS NULL),
  restrictions TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(restrictions) <= 30 AND array_position(restrictions, NULL) IS NULL),
  channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp', 'messenger', 'instagram', 'web']::TEXT[] CHECK (
    cardinality(channels) BETWEEN 1 AND 4 AND array_position(channels, NULL) IS NULL
    AND channels <@ ARRAY['whatsapp', 'messenger', 'instagram', 'web']::TEXT[]
  ),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  valid_until TIMESTAMPTZ CHECK (valid_until IS NULL OR valid_until > valid_from),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  change_reason VARCHAR(300) NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  approved_by TEXT, approved_at TIMESTAMPTZ,
  published_by TEXT, published_at TIMESTAMPTZ,
  archived_by TEXT, archived_at TIMESTAMPTZ,
  UNIQUE (tenant_id, item_key, version),
  CONSTRAINT catalog_items_pricing CHECK (
    (pricing_mode = 'quote' AND regular_cents IS NULL AND promo_cents IS NULL AND promo_months IS NULL
      AND promo_valid_until IS NULL AND billing_period IS NULL)
    OR (pricing_mode = 'fixed' AND regular_cents IS NOT NULL AND billing_period IS NOT NULL)
  ),
  CONSTRAINT catalog_items_promo CHECK (
    (promo_cents IS NULL) = (promo_months IS NULL)
    AND (promo_cents IS NULL OR promo_cents <= regular_cents)
    AND (promo_valid_until IS NULL OR promo_cents IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_items_one_published
  ON axiomos_commercial.catalog_items (tenant_id, item_key) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS axiomos_commercial.knowledge_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  entry_key TEXT NOT NULL CHECK (entry_key ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 100000),
  topic TEXT NOT NULL CHECK (topic IN ('faq', 'product', 'policy', 'hours', 'company', 'terms', 'approved_reply', 'handoff')),
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  title VARCHAR(160) NOT NULL CHECK (length(btrim(title)) >= 3),
  answer VARCHAR(1500) NOT NULL CHECK (length(btrim(answer)) >= 3),
  keywords TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(keywords) <= 25 AND array_position(keywords, NULL) IS NULL),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  valid_until TIMESTAMPTZ CHECK (valid_until IS NULL OR valid_until > valid_from),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  change_reason VARCHAR(300) NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  approved_by TEXT, approved_at TIMESTAMPTZ,
  published_by TEXT, published_at TIMESTAMPTZ,
  archived_by TEXT, archived_at TIMESTAMPTZ,
  UNIQUE (tenant_id, entry_key, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_entries_one_published
  ON axiomos_commercial.knowledge_entries (tenant_id, entry_key) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS axiomos_commercial.catalog_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK (entity IN ('item', 'knowledge')),
  entity_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create_draft', 'approve', 'publish', 'archive', 'restore')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason VARCHAR(300) NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX IF NOT EXISTS catalog_audit_lookup
  ON axiomos_commercial.catalog_audit (tenant_id, recorded_at DESC);

-- Contenido inmutable y transiciones válidas.
CREATE OR REPLACE FUNCTION axiomos_commercial.catalog_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  workflow TEXT[] := ARRAY['status', 'approved_by', 'approved_at', 'published_by', 'published_at', 'archived_by', 'archived_at'];
BEGIN
  IF (to_jsonb(NEW) - workflow) IS DISTINCT FROM (to_jsonb(OLD) - workflow) THEN
    RAISE EXCEPTION 'El contenido de una versión es inmutable; crea una versión nueva' USING ERRCODE = '22023';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('approved', 'archived')) OR
    (OLD.status = 'approved' AND NEW.status IN ('published', 'archived')) OR
    (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'Transición no permitida: % -> %', OLD.status, NEW.status USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS catalog_items_guard ON axiomos_commercial.catalog_items;
CREATE TRIGGER catalog_items_guard BEFORE UPDATE ON axiomos_commercial.catalog_items
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.catalog_guard();
DROP TRIGGER IF EXISTS knowledge_entries_guard ON axiomos_commercial.knowledge_entries;
CREATE TRIGGER knowledge_entries_guard BEFORE UPDATE ON axiomos_commercial.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.catalog_guard();

CREATE OR REPLACE FUNCTION axiomos_commercial.audit_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La auditoría solo admite inserciones' USING ERRCODE = '42501';
END
$$;
DROP TRIGGER IF EXISTS catalog_audit_append_only ON axiomos_commercial.catalog_audit;
CREATE TRIGGER catalog_audit_append_only BEFORE UPDATE OR DELETE ON axiomos_commercial.catalog_audit
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.audit_append_only();
CREATE OR REPLACE FUNCTION axiomos_commercial.no_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'No se eliminan versiones; archívalas' USING ERRCODE = '42501';
END
$$;
DROP TRIGGER IF EXISTS catalog_items_no_delete ON axiomos_commercial.catalog_items;
CREATE TRIGGER catalog_items_no_delete BEFORE DELETE ON axiomos_commercial.catalog_items
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.no_delete();
DROP TRIGGER IF EXISTS knowledge_entries_no_delete ON axiomos_commercial.knowledge_entries;
CREATE TRIGGER knowledge_entries_no_delete BEFORE DELETE ON axiomos_commercial.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION axiomos_commercial.no_delete();

-- Aislamiento entre negocios.
REVOKE ALL ON axiomos_commercial.catalog_items, axiomos_commercial.knowledge_entries,
  axiomos_commercial.catalog_audit FROM PUBLIC;
ALTER TABLE axiomos_commercial.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.catalog_items FORCE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.knowledge_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.catalog_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.catalog_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_items_tenant ON axiomos_commercial.catalog_items;
CREATE POLICY catalog_items_tenant ON axiomos_commercial.catalog_items
  USING (tenant_id = current_setting('axiomos.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('axiomos.tenant_id', true));
DROP POLICY IF EXISTS knowledge_entries_tenant ON axiomos_commercial.knowledge_entries;
CREATE POLICY knowledge_entries_tenant ON axiomos_commercial.knowledge_entries
  USING (tenant_id = current_setting('axiomos.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('axiomos.tenant_id', true));
DROP POLICY IF EXISTS catalog_audit_tenant ON axiomos_commercial.catalog_audit;
CREATE POLICY catalog_audit_tenant ON axiomos_commercial.catalog_audit
  USING (tenant_id = current_setting('axiomos.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('axiomos.tenant_id', true));

-- Permisos para los roles que ya existan (producción o QA). No crea roles ni contraseñas.
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_reader', 'axiomos_offers_qa_reader'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA axiomos_commercial TO %I', r);
      EXECUTE format('GRANT SELECT ON axiomos_commercial.catalog_items, axiomos_commercial.knowledge_entries, axiomos_commercial.catalog_audit TO %I', r);
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['axiomos_commercial_writer', 'axiomos_autopilot_qa_offer_writer'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA axiomos_commercial TO %I', r);
      EXECUTE format('GRANT SELECT, INSERT ON axiomos_commercial.catalog_items, axiomos_commercial.knowledge_entries, axiomos_commercial.catalog_audit TO %I', r);
      EXECUTE format('GRANT UPDATE (status, approved_by, approved_at, published_by, published_at, archived_by, archived_at) ON axiomos_commercial.catalog_items, axiomos_commercial.knowledge_entries TO %I', r);
    END IF;
  END LOOP;
END
$$;
COMMIT;
