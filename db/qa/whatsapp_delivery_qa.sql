-- QA ONLY. Apply on isolated Neon branch, never on production without review.
CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_qa (
  inbound_message_id text PRIMARY KEY,
  conversation_key text NOT NULL,
  state text NOT NULL CHECK (state IN ('received','processing','sent','failed','unknown')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_until timestamptz,
  outbound_message_id text,
  reply_text text,
  last_error_code text,
  last_error_details text,
  provider_status text,
  provider_status_at timestamptz,
  provider_error_code text,
  next_retry_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Feature gate requires AXIOMOS_WHATSAPP_DELIVERY_QA_ENABLED=true and
-- AXIOMOS_WHATSAPP_DELIVERY_QA_ISOLATED=true. Never enable on live domain.
-- CAUTION: This is an observational prototype, NOT full idempotent outbound delivery.
-- A successful send followed by a crash can still leave state ambiguous.

-- Idempotent upgrade for existing QA branches created before status reconciliation.
ALTER TABLE public.whatsapp_delivery_qa
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_error_code text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE TABLE IF NOT EXISTS public.whatsapp_status_events_qa (
  outbound_message_id text NOT NULL,
  provider_status text NOT NULL
    CHECK (provider_status IN ('sent','delivered','read','failed')),
  provider_timestamp bigint NOT NULL,
  error_code text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (outbound_message_id, provider_status, provider_timestamp)
);
CREATE INDEX IF NOT EXISTS whatsapp_delivery_qa_outbound_idx
  ON public.whatsapp_delivery_qa(outbound_message_id)
  WHERE outbound_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_delivery_qa_retry_idx
  ON public.whatsapp_delivery_qa(next_retry_at)
  WHERE state='failed';

-- Durable synthetic intake snapshot: worker can reconstruct a reply after
-- Brain fails before reply_text exists. Strict QA guard keeps real traffic out.
ALTER TABLE public.whatsapp_delivery_qa
  ADD COLUMN IF NOT EXISTS inbound_text text,
  ADD COLUMN IF NOT EXISTS recipient_kind text,
  ADD COLUMN IF NOT EXISTS recipient_value text,
  ADD COLUMN IF NOT EXISTS intake_error text;
