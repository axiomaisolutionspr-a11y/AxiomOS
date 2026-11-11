-- Apply only on qa-meta-whatsapp-autopilot-20261110, never on production.
CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_qa_processing (
  message_hash text PRIMARY KEY CHECK (message_hash ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK (state IN ('processing', 'completed', 'failed')),
  attempt_id text NOT NULL,
  reply text CHECK (length(reply) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON axiomos_qa_ingress_scope.meta_whatsapp_qa_processing TO axiomos_wa_qa_ingress;
COMMENT ON TABLE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing IS
  'QA only: deduplicated message hashes and generated replies; no sender identifiers or incoming text.';
