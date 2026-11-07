-- QA pilot. Run as a migration role in the dedicated QA database.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DO $$
BEGIN
  IF current_database() <> 'axiomos_offers_qa' THEN
    RAISE EXCEPTION 'This pilot migration requires axiomos_offers_qa';
  END IF;
END
$$;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS axiomos_commercial;

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
COMMIT;
