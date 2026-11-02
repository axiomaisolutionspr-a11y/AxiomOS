-- Apply to Neon QA first. Production application is a separate release step.
CREATE TABLE IF NOT EXISTS axira_whatsapp_delivery (
  message_id text PRIMARY KEY,
  conversation_key text NOT NULL,
  payload_hash text NOT NULL,
  owner_token uuid NOT NULL,
  state text NOT NULL CHECK (state IN
    ('processing', 'retryable', 'sending', 'sent', 'uncertain', 'ignored')),
  reply_text text,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
