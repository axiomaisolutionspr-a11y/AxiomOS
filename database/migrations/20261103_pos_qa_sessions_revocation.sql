-- AxiomOS POS SESSION REVOCATION: QA NEON BRANCH ONLY.
-- Requires 20261103_pos_runtime_rls_qa_only.sql and existing POS entities.
-- Do not apply to production.
BEGIN;
CREATE TABLE IF NOT EXISTS pos_qa_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  merchant_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  username text NOT NULL CHECK (length(username) BETWEEN 3 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY (merchant_id,actor_id) REFERENCES pos_operators(merchant_id,id),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS pos_qa_sessions_expiry
  ON pos_qa_sessions(merchant_id,expires_at);
ALTER TABLE pos_qa_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE (revoked_at) ON pos_qa_sessions TO pos_qa_app_login;
CREATE POLICY pos_qa_session_read ON pos_qa_sessions
 FOR SELECT TO pos_qa_app_login
 USING (merchant_id::text = NULLIF(current_setting('axiomos.merchant_id',true),''));
CREATE POLICY pos_qa_session_insert ON pos_qa_sessions
 FOR INSERT TO pos_qa_app_login
 WITH CHECK (merchant_id::text = NULLIF(current_setting('axiomos.merchant_id',true),'')
  AND revoked_at IS NULL AND expires_at > now());
CREATE POLICY pos_qa_session_update ON pos_qa_sessions
 FOR UPDATE TO pos_qa_app_login
 USING (merchant_id::text = NULLIF(current_setting('axiomos.merchant_id',true),''))
 WITH CHECK (merchant_id::text = NULLIF(current_setting('axiomos.merchant_id',true),''));
COMMIT;
