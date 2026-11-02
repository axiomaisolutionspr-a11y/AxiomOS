-- Apply only to the isolated Neon QA branch until the full webhook flow is validated.
-- Never infer the 24h customer service window from database created_at.
CREATE TABLE IF NOT EXISTS axira_advisor_inbound_verified (
  message_id text PRIMARY KEY,
  phone text NOT NULL,
  provider_timestamp timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_timestamp <= recorded_at + interval '30 seconds')
);
CREATE INDEX IF NOT EXISTS axira_advisor_verified_phone_time_idx
 ON axira_advisor_inbound_verified (phone, provider_timestamp DESC);
