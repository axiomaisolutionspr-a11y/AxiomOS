-- Apply only to the isolated WhatsApp QA branch.
CREATE TABLE IF NOT EXISTS axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply (
  challenge_hash text PRIMARY KEY CHECK (challenge_hash ~ '^[0-9a-f]{64}$'),
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz NOT NULL DEFAULT date_trunc('second', now()),
  expires_at timestamptz NOT NULL CHECK (expires_at > issued_at),
  claimed_message_hash text UNIQUE REFERENCES axiomos_qa_ingress_scope.meta_whatsapp_qa_processing(message_hash)
);

REVOKE INSERT, UPDATE, DELETE ON axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply FROM axiomos_wa_qa_ingress;
GRANT SELECT, UPDATE (claimed_message_hash) ON axiomos_qa_ingress_scope.meta_whatsapp_qa_auto_reply TO axiomos_wa_qa_ingress;
GRANT INSERT (message_hash, authorization_hash, recipient_hash, expires_at, attempted_at) ON axiomos_qa_ingress_scope.meta_whatsapp_qa_delivery TO axiomos_wa_qa_ingress;
