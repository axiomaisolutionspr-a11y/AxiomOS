-- Apply only to the isolated WhatsApp QA branch.
CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery (
  message_hash text PRIMARY KEY REFERENCES axiomos_qa_ingress_scope.meta_whatsapp_qa_processing(message_hash),
  authorization_hash text UNIQUE NOT NULL,
  recipient_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempted_at timestamptz,
  accepted_at timestamptz,
  provider_message_hash text UNIQUE,
  provider_error_code integer,
  delivered_at timestamptz,
  failed_at timestamptz
);

GRANT SELECT, UPDATE ON axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery TO axiomos_wa_qa_ingress;
