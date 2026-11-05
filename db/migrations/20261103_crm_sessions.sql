-- Apply on an isolated Neon QA branch before AXIOMOS_CRM_SESSION_V2_ENABLED=true.
-- No existing CRM tables, cookies, or rows are modified.
CREATE TABLE IF NOT EXISTS crm_admin_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS crm_admin_sessions_expiry_idx ON crm_admin_sessions (expires_at);
CREATE TABLE IF NOT EXISTS crm_auth_attempts (
  client_hash text PRIMARY KEY CHECK (length(client_hash)=64),
  attempts integer NOT NULL DEFAULT 0,
  window_ends_at timestamptz NOT NULL
);
-- Scope: only CRM authentication. No changes to tenants, leads or payment tables.
