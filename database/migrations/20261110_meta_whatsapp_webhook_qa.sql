CREATE SCHEMA IF NOT EXISTS axiomos_qa_ingress_scope;

CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_webhook_events (
  event_id text PRIMARY KEY,
  waba_id text,
  phone_number_id text,
  field text NOT NULL CHECK (field = 'messages'),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  status_count integer NOT NULL DEFAULT 0 CHECK (status_count >= 0),
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE axiomos_qa_ingress_scope.meta_whatsapp_webhook_events IS
  'Sanitized QA webhook receipts only; no sender IDs, message text, tokens, or raw payloads.';
