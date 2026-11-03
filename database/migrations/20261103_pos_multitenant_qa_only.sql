-- AxiomOS POS: schema blueprint for an isolated Neon QA branch ONLY.
-- DO NOT run in production. No payment processing or fiscal certification.
-- All POS reads/writes must derive merchant_id from authenticated server-side membership;
-- never trust a tenant_id supplied by a browser.
BEGIN;

CREATE TABLE IF NOT EXISTS pos_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (length(trim(business_name)) BETWEEN 1 AND 180),
  status text NOT NULL DEFAULT 'pilot' CHECK (status IN ('pilot','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  identity_subject text NOT NULL CHECK (length(identity_subject) BETWEEN 1 AND 200),
  role text NOT NULL CHECK (role IN ('owner','manager','cashier','auditor')),
  disabled_at timestamptz,
  UNIQUE (merchant_id, identity_subject),
  UNIQUE (merchant_id, id)
);

CREATE TABLE IF NOT EXISTS pos_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, id)
);

CREATE TABLE IF NOT EXISTS pos_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  FOREIGN KEY (merchant_id,location_id) REFERENCES pos_locations(merchant_id,id),
  UNIQUE (merchant_id,id),
  UNIQUE (merchant_id,location_id,id)
);

CREATE TABLE IF NOT EXISTS pos_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  sku text NOT NULL,
  description text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  tax_basis_points integer NOT NULL CHECK (tax_basis_points BETWEEN 0 AND 10000),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (merchant_id,sku),
  UNIQUE (merchant_id,id)
);

CREATE TABLE IF NOT EXISTS pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  location_id uuid NOT NULL,
  station_id uuid NOT NULL,
  created_by uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 180),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','payment_pending','paid','cancelled','refunded')),
  subtotal_cents bigint NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents bigint NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents bigint GENERATED ALWAYS AS (subtotal_cents + tax_cents) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id,location_id) REFERENCES pos_locations(merchant_id,id),
  FOREIGN KEY (merchant_id,location_id,station_id) REFERENCES pos_stations(merchant_id,location_id,id),
  FOREIGN KEY (merchant_id,created_by) REFERENCES pos_operators(merchant_id,id),
  UNIQUE (merchant_id,idempotency_key),
  UNIQUE (merchant_id,id)
);

CREATE TABLE IF NOT EXISTS pos_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  line_number integer NOT NULL CHECK (line_number > 0),
  sku_snapshot text NOT NULL,
  description_snapshot text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  tax_basis_points integer NOT NULL CHECK (tax_basis_points BETWEEN 0 AND 10000),
  line_subtotal_cents bigint NOT NULL CHECK (line_subtotal_cents >= 0),
  line_tax_cents bigint NOT NULL CHECK (line_tax_cents >= 0),
  FOREIGN KEY (merchant_id,order_id) REFERENCES pos_orders(merchant_id,id),
  UNIQUE (order_id,line_number)
);

-- Payment states are reserved for future certified provider integration.
-- No PAN/CVV/PIN or other cardholder data may be stored.
CREATE TABLE IF NOT EXISTS pos_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  provider text NOT NULL,
  provider_payment_reference text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','pending','confirmed','rejected','unknown','reversed')),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id,order_id) REFERENCES pos_orders(merchant_id,id),
  UNIQUE (merchant_id,provider,idempotency_key)
);

CREATE TABLE IF NOT EXISTS pos_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  actor_id uuid,
  order_id uuid,
  action text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id,actor_id) REFERENCES pos_operators(merchant_id,id),
  FOREIGN KEY (merchant_id,order_id) REFERENCES pos_orders(merchant_id,id)
);

CREATE INDEX IF NOT EXISTS pos_orders_recent ON pos_orders(merchant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS pos_payments_by_order ON pos_payment_attempts(merchant_id,order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS pos_audit_recent ON pos_audit_events(merchant_id,created_at DESC);

-- Defense in depth: no policy => no rows to roles without BYPASSRLS.
-- A subsequent QA-only release must define verified roles + tenant authorization policies.
ALTER TABLE pos_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_audit_events ENABLE ROW LEVEL SECURITY;

COMMIT;
