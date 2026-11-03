-- AxiomOS POS QA only. Apply to isolated Neon QA branch after prior POS migrations.
-- This transaction deliberately NEVER inserts bank payments, marks orders "paid",
-- or produces fiscal receipts. Simulations must not be used for tax reporting.
BEGIN;

CREATE TABLE IF NOT EXISTS pos_qa_simulated_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  order_id uuid NOT NULL,
  simulated_by uuid NOT NULL,
  label text NOT NULL DEFAULT 'SIMULACIÓN — NO ES PAGO NI RECIBO FISCAL'
     CHECK (label = 'SIMULACIÓN — NO ES PAGO NI RECIBO FISCAL'),
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents bigint NOT NULL CHECK (tax_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id,location_id) REFERENCES pos_locations(merchant_id,id),
  FOREIGN KEY (merchant_id,order_id) REFERENCES pos_orders(merchant_id,id),
  FOREIGN KEY (merchant_id,simulated_by) REFERENCES pos_operators(merchant_id,id),
  UNIQUE (merchant_id, order_id)
);

CREATE TABLE IF NOT EXISTS pos_qa_simulated_receipt_lines (
  merchant_id uuid NOT NULL,
  receipt_id uuid NOT NULL REFERENCES pos_qa_simulated_receipts(id),
  line_number integer NOT NULL CHECK (line_number > 0),
  sku text NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  tax_basis_points integer NOT NULL,
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents bigint NOT NULL CHECK (tax_cents >= 0),
  PRIMARY KEY(receipt_id, line_number),
  FOREIGN KEY (merchant_id) REFERENCES pos_merchants(id)
);

-- Idempotent provider event inbox for future provider onboarding; no raw payload,
-- tokens, PAN/CVV, banking secrets, or customer PII.
CREATE TABLE IF NOT EXISTS pos_provider_event_inbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES pos_merchants(id),
  provider text NOT NULL CHECK (provider IN ('ath_business','evertec_link','clover')),
  external_event_id text NOT NULL CHECK (length(external_event_id) BETWEEN 8 AND 180),
  event_kind text NOT NULL,
  status text NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified','needs_reconciliation','verified','rejected')),
  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  UNIQUE (merchant_id,provider,external_event_id)
);

-- Don't use this inbox to post inventory or transition "paid" on its own.
CREATE INDEX IF NOT EXISTS pos_provider_event_unverified_idx ON
  pos_provider_event_inbox(merchant_id,provider,status,received_at);

ALTER TABLE pos_qa_simulated_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_qa_simulated_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_provider_event_inbox ENABLE ROW LEVEL SECURITY;

-- Extend existing stock-movement constraint for purely simulated QA sale.
ALTER TABLE pos_inventory_movements DROP CONSTRAINT IF EXISTS pos_inventory_movements_reason_check;
ALTER TABLE pos_inventory_movements
  ADD CONSTRAINT pos_inventory_movements_reason_check
  CHECK (reason IN ('restock','manual_adjustment','stocktake','sale_simulated'));

CREATE OR REPLACE FUNCTION pos_qa_simulate_checkout(
 p_merchant uuid, p_order uuid, p_actor uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
 SET search_path=public,pg_temp AS $$
DECLARE
 v_order pos_orders%ROWTYPE;
 v_operator_role text;
 v_line record;
 v_balance integer;
 v_receipt uuid;
 v_catalog uuid;
 v_count integer := 0;
BEGIN
 IF p_merchant IS NULL OR p_order IS NULL OR p_actor IS NULL
 THEN RAISE EXCEPTION 'QA checkout: missing identity'; END IF;

 SELECT role INTO v_operator_role FROM pos_operators
 WHERE merchant_id=p_merchant AND id=p_actor AND disabled_at IS NULL
  AND role IN ('owner','manager','cashier');
 IF v_operator_role IS NULL THEN
  RAISE EXCEPTION 'QA checkout: unauthorized operator'; END IF;

 -- Lock order row: only one checkout at a time even if two cashiers click.
 SELECT * INTO v_order FROM pos_orders
 WHERE merchant_id=p_merchant AND id=p_order FOR UPDATE;
 IF NOT FOUND OR v_order.status <> 'draft'
 THEN RAISE EXCEPTION 'QA checkout: draft not found'; END IF;

 -- An idempotent repeat is allowed only for same cashier.
 SELECT id INTO v_receipt FROM pos_qa_simulated_receipts
 WHERE merchant_id=p_merchant AND order_id=p_order AND simulated_by=p_actor;
 IF FOUND THEN RETURN v_receipt; END IF;
 IF EXISTS (SELECT 1 FROM pos_qa_simulated_receipts WHERE merchant_id=p_merchant AND order_id=p_order)
 THEN RAISE EXCEPTION 'QA checkout: already simulated by another operator'; END IF;

 IF v_order.created_by<>p_actor AND v_operator_role NOT IN ('owner','manager')
 THEN RAISE EXCEPTION 'QA checkout: cashier cannot finalize another user draft'; END IF;

 IF v_order.total_cents <= 0 THEN
   RAISE EXCEPTION 'QA checkout: zero amount'; END IF;

 INSERT INTO pos_qa_simulated_receipts(merchant_id,location_id,order_id,simulated_by,
   subtotal_cents,tax_cents,total_cents)
 VALUES(p_merchant,v_order.location_id,p_order,p_actor,
   v_order.subtotal_cents,v_order.tax_cents,v_order.total_cents)
 RETURNING id INTO v_receipt;

 FOR v_line IN SELECT * FROM pos_order_lines
   WHERE merchant_id=p_merchant AND order_id=p_order ORDER BY line_number LOOP
   v_count := v_count+1;
   SELECT id INTO v_catalog FROM pos_catalog WHERE merchant_id=p_merchant
      AND sku=v_line.sku_snapshot;
   IF NOT FOUND THEN RAISE EXCEPTION 'QA checkout: catalog SKU missing'; END IF;
   -- Atomic conditional update: no negative inventory and no double debit.
   UPDATE pos_inventory_balances
   SET on_hand=on_hand-v_line.quantity, updated_at=now()
   WHERE merchant_id=p_merchant AND location_id=v_order.location_id
      AND catalog_id=v_catalog AND on_hand>=v_line.quantity
   RETURNING on_hand INTO v_balance;
   IF NOT FOUND THEN RAISE EXCEPTION 'QA checkout: insufficient inventory'; END IF;

   INSERT INTO pos_inventory_movements(merchant_id,location_id,catalog_id,
     operator_id,idempotency_key,delta,reason,resulting_on_hand)
   VALUES(p_merchant,v_order.location_id,v_catalog,p_actor,
     'SIM-'||p_order::text||'-'||v_line.line_number,
     -v_line.quantity,'sale_simulated',v_balance);

   INSERT INTO pos_qa_simulated_receipt_lines(
     merchant_id,receipt_id,line_number,sku,description,quantity,
     unit_price_cents,tax_basis_points,subtotal_cents,tax_cents
   ) VALUES(
     p_merchant,v_receipt,v_line.line_number,v_line.sku_snapshot,
     v_line.description_snapshot,v_line.quantity,v_line.unit_price_cents,
     v_line.tax_basis_points,v_line.line_subtotal_cents,v_line.line_tax_cents);
 END LOOP;
 IF v_count = 0 THEN RAISE EXCEPTION 'QA checkout: no order items'; END IF;

 INSERT INTO pos_audit_events(merchant_id,actor_id,order_id,action,context)
 VALUES(p_merchant,p_actor,p_order,'SIMULATED_NO_PAYMENT',
   jsonb_build_object('receipt_id',v_receipt,'total_cents',v_order.total_cents));
 RETURN v_receipt;
END
$$;

REVOKE ALL ON FUNCTION pos_qa_simulate_checkout(uuid,uuid,uuid) FROM PUBLIC;
COMMIT;
