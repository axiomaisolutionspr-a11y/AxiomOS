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
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Feature gate requires AXIOMOS_WHATSAPP_DELIVERY_QA_ENABLED=true and
-- AXIOMOS_WHATSAPP_DELIVERY_QA_ISOLATED=true. Never enable on live domain.
-- CAUTION: This is an observational prototype, NOT full idempotent outbound delivery.
-- A successful send followed by a crash can still leave state ambiguous.
