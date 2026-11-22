-- Token store for third-party integrations whose tokens rotate (Instagram long-lived token).
-- Only the app owner role reads/writes it; no grants to other roles.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

CREATE TABLE IF NOT EXISTS public.integration_tokens (
  name text PRIMARY KEY CHECK (name ~ '^[a-z0-9_]{3,64}$'),
  token text NOT NULL CHECK (length(token) >= 20),
  seed_hash text NOT NULL CHECK (seed_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  refreshed_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
REVOKE ALL ON public.integration_tokens FROM PUBLIC,
  axiomos_commercial_reader, axiomos_commercial_writer, axiomos_meta_preferences_ingress;

COMMIT;
