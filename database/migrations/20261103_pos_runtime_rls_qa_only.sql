-- QA ONLY. NEVER run on production.
-- Dedicated LOGIN account has no password until provisioned securely out of band.
-- SELECT tenant policies from the preceding QA read-only pilot are inherited.
BEGIN;
CREATE ROLE pos_qa_app_login LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS INHERIT;
GRANT pos_qa_rls_test TO pos_qa_app_login WITH INHERIT TRUE, SET FALSE;
GRANT USAGE ON SCHEMA public TO pos_qa_app_login;
GRANT INSERT (merchant_id,location_id,station_id,created_by,idempotency_key,request_payload,status)
  ON pos_orders TO pos_qa_app_login;
GRANT UPDATE (subtotal_cents,tax_cents) ON pos_orders TO pos_qa_app_login;
GRANT INSERT ON pos_order_lines TO pos_qa_app_login;
GRANT INSERT ON pos_audit_events TO pos_qa_app_login;
GRANT USAGE ON SEQUENCE pos_audit_events_id_seq TO pos_qa_app_login;
GRANT EXECUTE ON FUNCTION pos_qa_create_draft_order(uuid,uuid,uuid,uuid,text,jsonb)
  TO pos_qa_app_login;

-- Required for QA checkout function later; no HTTP checkout endpoint is exposed.
GRANT SELECT, INSERT, UPDATE ON pos_inventory_balances TO pos_qa_app_login;
GRANT SELECT, INSERT ON pos_inventory_movements TO pos_qa_app_login;
GRANT USAGE ON SEQUENCE pos_inventory_movements_id_seq TO pos_qa_app_login;
GRANT SELECT, INSERT ON pos_qa_simulated_receipts, pos_qa_simulated_receipt_lines
  TO pos_qa_app_login;
GRANT EXECUTE ON FUNCTION pos_qa_simulate_checkout(uuid,uuid,uuid) TO pos_qa_app_login;
GRANT EXECUTE ON FUNCTION pos_qa_adjust_stock(uuid,uuid,uuid,uuid,text,integer,text)
  TO pos_qa_app_login;

-- Direct SQL cannot change orders to paid (only draft creation and total updates).
CREATE POLICY pos_qa_insert_order ON pos_orders FOR INSERT TO pos_qa_app_login
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),'')
   AND status='draft');
CREATE POLICY pos_qa_update_order ON pos_orders FOR UPDATE TO pos_qa_app_login
 USING (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),'') AND status='draft')
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),'') AND status='draft');
CREATE POLICY pos_qa_insert_order_line ON pos_order_lines FOR INSERT TO pos_qa_app_login
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''));
CREATE POLICY pos_qa_insert_audit ON pos_audit_events FOR INSERT TO pos_qa_app_login
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),'')
   AND action IN ('draft_created','stock_adjusted','SIMULATED_NO_PAYMENT'));
CREATE POLICY pos_qa_inventory_balances ON pos_inventory_balances FOR ALL TO pos_qa_app_login
 USING (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''))
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''));
CREATE POLICY pos_qa_inventory_movements ON pos_inventory_movements FOR ALL TO pos_qa_app_login
 USING (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''))
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''));
CREATE POLICY pos_qa_receipts ON pos_qa_simulated_receipts FOR ALL TO pos_qa_app_login
 USING (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''))
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''));
CREATE POLICY pos_qa_receipt_lines ON pos_qa_simulated_receipt_lines FOR ALL TO pos_qa_app_login
 USING (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''))
 WITH CHECK (merchant_id::text=nullif(current_setting('axiomos.merchant_id',true),''));

-- This throttle is independent of tenant data; keys are HMAC digests, never passwords.
CREATE TABLE pos_qa_login_limiter(
  key_hash text NOT NULL CHECK(key_hash ~ '^[a-f0-9]{64}$'),
  window_bucket bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK(attempts>=1),
  PRIMARY KEY(key_hash,window_bucket)
);
GRANT SELECT, INSERT, UPDATE ON pos_qa_login_limiter TO pos_qa_app_login;
COMMIT;
