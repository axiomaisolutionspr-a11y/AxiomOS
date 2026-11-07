-- Crear primero en la base QA (nunca ejecutarlo automáticamente en producción).
-- Tabla independiente: no altera tablas existentes ni elimina información.
CREATE TABLE IF NOT EXISTS axiomai_offers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(300) NOT NULL DEFAULT '',
  monthly_usd NUMERIC(9,2) NOT NULL CHECK (monthly_usd >= 0),
  activation_usd NUMERIC(9,2) NOT NULL CHECK (activation_usd >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms VARCHAR(600) NOT NULL DEFAULT '',
  max_clients INTEGER CHECK (max_clients IS NULL OR max_clients BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS axiomai_offers_status_dates_idx
  ON axiomai_offers (status, start_date, end_date);
-- Intencionadamente no hay INSERT: las promociones de octubre caducaron.
