-- Apply only after verifying the target branch and deployment.
CREATE TABLE IF NOT EXISTS axira_advisor_outbound (
  request_id uuid PRIMARY KEY,
  conversation_key text NOT NULL,
  recipient text NOT NULL,
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('phone', 'bsuid')),
  body text NOT NULL,
  advisor text NOT NULL,
  state text NOT NULL CHECK (state IN ('draft', 'sending', 'accepted', 'uncertain')),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
