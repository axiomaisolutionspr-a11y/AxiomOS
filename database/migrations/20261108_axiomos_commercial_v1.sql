-- Production candidate for internal AxiomAI tenant. Test on a child branch first.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$
BEGIN
  IF current_database() <> 'neondb' THEN
    RAISE EXCEPTION 'This pilot migration requires neondb';
  END IF;
END
$$;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS axiomos_commercial;
REVOKE ALL ON SCHEMA axiomos_commercial FROM PUBLIC;

CREATE TABLE IF NOT EXISTS axiomos_commercial.offers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id = 'axiomai'),
  product_key TEXT NOT NULL CHECK (product_key IN (
    'whatsapp', 'crm', 'brain', 'recepcion', 'automatizacion', 'publicidad', 'robotica', 'integraciones'
  )),
  request_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL CHECK (length(trim(name)) >= 3),
  normal_cents INTEGER NOT NULL CHECK (normal_cents BETWEEN 0 AND 99999999),
  promo_cents INTEGER NOT NULL CHECK (promo_cents BETWEEN 0 AND normal_cents),
  activation_cents INTEGER NOT NULL CHECK (activation_cents BETWEEN 0 AND 99999999),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  channels TEXT[] NOT NULL CHECK (
    cardinality(channels) BETWEEN 1 AND 4
    AND array_position(channels, NULL) IS NULL
    AND channels <@ ARRAY['whatsapp', 'messenger', 'instagram', 'web']::TEXT[]
  ),
  tax_included BOOLEAN NOT NULL,
  terms_es VARCHAR(120) NOT NULL CHECK (length(trim(terms_es)) > 0),
  terms_en VARCHAR(120) NOT NULL DEFAULT '',
  external_es VARCHAR(80) NOT NULL CHECK (length(trim(external_es)) > 0),
  external_en VARCHAR(80) NOT NULL DEFAULT '',
  max_clients INTEGER CHECK (max_clients BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paused')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (tenant_id, request_id),
  UNIQUE (tenant_id, id),
  CONSTRAINT offers_no_approved_overlap EXCLUDE USING gist (
    tenant_id WITH =,
    product_key WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'approved')
);

CREATE TABLE IF NOT EXISTS axiomos_commercial.offer_audit (
  tenant_id TEXT NOT NULL,
  offer_id BIGINT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'paused')),
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id, offer_id, revision),
  FOREIGN KEY (tenant_id, offer_id) REFERENCES axiomos_commercial.offers (tenant_id, id)
);
REVOKE ALL ON axiomos_commercial.offers, axiomos_commercial.offer_audit FROM PUBLIC;
ALTER TABLE axiomos_commercial.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE axiomos_commercial.offer_audit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'axiomos_commercial' AND tablename = 'offers' AND policyname = 'offers_axiomai_select') THEN
    CREATE POLICY offers_axiomai_select ON axiomos_commercial.offers FOR SELECT USING (tenant_id = 'axiomai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'axiomos_commercial' AND tablename = 'offers' AND policyname = 'offers_axiomai_insert') THEN
    CREATE POLICY offers_axiomai_insert ON axiomos_commercial.offers FOR INSERT WITH CHECK (tenant_id = 'axiomai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'axiomos_commercial' AND tablename = 'offers' AND policyname = 'offers_axiomai_update') THEN
    CREATE POLICY offers_axiomai_update ON axiomos_commercial.offers FOR UPDATE USING (tenant_id = 'axiomai') WITH CHECK (tenant_id = 'axiomai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'axiomos_commercial' AND tablename = 'offer_audit' AND policyname = 'offer_audit_axiomai_select') THEN
    CREATE POLICY offer_audit_axiomai_select ON axiomos_commercial.offer_audit FOR SELECT USING (tenant_id = 'axiomai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'axiomos_commercial' AND tablename = 'offer_audit' AND policyname = 'offer_audit_axiomai_insert') THEN
    CREATE POLICY offer_audit_axiomai_insert ON axiomos_commercial.offer_audit FOR INSERT WITH CHECK (tenant_id = 'axiomai');
  END IF;
END $$;
COMMIT;
