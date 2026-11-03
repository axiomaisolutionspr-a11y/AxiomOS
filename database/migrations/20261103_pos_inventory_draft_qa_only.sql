-- QA ONLY. Requires 20261103_pos_multitenant_qa_only.sql with location/station FK fix.
-- Never apply to production without tenant-auth review, fiscal approval and integration testing.
-- PostgreSQL functions are deliberately not exposed to PUBLIC, nor via any HTTP route.

BEGIN;

ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS request_payload jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS pos_inventory_balances (
  merchant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  catalog_id uuid NOT NULL,
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id,location_id,catalog_id),
  FOREIGN KEY (merchant_id,location_id) REFERENCES pos_locations(merchant_id,id),
  FOREIGN KEY (merchant_id,catalog_id) REFERENCES pos_catalog(merchant_id,id)
);

CREATE TABLE IF NOT EXISTS pos_inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  catalog_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 180),
  delta integer NOT NULL CHECK (delta <> 0 AND delta BETWEEN -10000 AND 10000),
  reason text NOT NULL CHECK (reason IN ('restock','manual_adjustment','stocktake')),
  resulting_on_hand integer NOT NULL CHECK (resulting_on_hand BETWEEN 0 AND 100000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id,location_id) REFERENCES pos_locations(merchant_id,id),
  FOREIGN KEY (merchant_id,catalog_id) REFERENCES pos_catalog(merchant_id,id),
  FOREIGN KEY (merchant_id,operator_id) REFERENCES pos_operators(merchant_id,id),
  UNIQUE (merchant_id,location_id,idempotency_key)
);

CREATE INDEX IF NOT EXISTS pos_inventory_history_idx
  ON pos_inventory_movements(merchant_id,location_id,catalog_id,created_at DESC);

ALTER TABLE pos_inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_inventory_movements ENABLE ROW LEVEL SECURITY;

-- Internal QA-only operation: records a DRAFT quote/order with catalog-controlled prices.
-- No stock reduction, no fiscal receipt and no "paid" status are written.
CREATE OR REPLACE FUNCTION pos_qa_create_draft_order(
  p_merchant uuid, p_location uuid, p_station uuid, p_actor uuid,
  p_idempotency_key text, p_items jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_existing pos_orders%ROWTYPE;
  v_order uuid;
  v_item jsonb;
  v_sku text;
  v_qty integer;
  v_price bigint;
  v_tax_rate integer;
  v_description text;
  v_seen text[] := ARRAY[]::text[];
  v_sub numeric := 0;
  v_tax numeric := 0;
  v_line_sub numeric;
  v_line_tax numeric;
  v_line integer := 0;
BEGIN
  IF p_merchant IS NULL OR p_location IS NULL OR p_station IS NULL OR p_actor IS NULL
     OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 180
  THEN RAISE EXCEPTION 'POS draft: invalid identity or idempotency key'; END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50
  THEN RAISE EXCEPTION 'POS draft: invalid items'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM pos_operators WHERE id=p_actor AND merchant_id=p_merchant
      AND disabled_at IS NULL AND role IN ('owner','manager','cashier')
  ) THEN RAISE EXCEPTION 'POS draft: operator not permitted'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM pos_stations WHERE id=p_station AND merchant_id=p_merchant
      AND location_id=p_location AND active
  ) THEN RAISE EXCEPTION 'POS draft: station does not belong to location'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pos-draft:'||p_merchant::text||':'||p_idempotency_key,0));

  SELECT * INTO v_existing FROM pos_orders
    WHERE merchant_id=p_merchant AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_payload IS DISTINCT FROM p_items
       OR v_existing.station_id <> p_station OR v_existing.location_id <> p_location
       OR v_existing.created_by <> p_actor
    THEN RAISE EXCEPTION 'POS draft: idempotency key reused with different order'; END IF;
    RETURN v_existing.id;
  END IF;

  -- All validations happen inside one PostgreSQL transaction. Errors roll everything back.
  INSERT INTO pos_orders(merchant_id,location_id,station_id,created_by,
    idempotency_key,request_payload,status)
  VALUES(p_merchant,p_location,p_station,p_actor,p_idempotency_key,p_items,'draft')
  RETURNING id INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item) <> 'object'
       OR jsonb_typeof(v_item->'sku') <> 'string'
       OR jsonb_typeof(v_item->'quantity') <> 'number'
    THEN RAISE EXCEPTION 'POS draft: malformed item'; END IF;
    v_sku := trim(v_item->>'sku');
    IF length(v_sku) NOT BETWEEN 1 AND 120 OR v_sku = ANY(v_seen)
       OR (v_item->>'quantity') !~ '^[1-9][0-9]{0,3}$'
    THEN RAISE EXCEPTION 'POS draft: invalid or duplicate SKU/quantity'; END IF;
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty > 9999 THEN RAISE EXCEPTION 'POS draft: quantity too large'; END IF;
    v_seen := array_append(v_seen,v_sku);

    SELECT price_cents,tax_basis_points,description INTO v_price,v_tax_rate,v_description
    FROM pos_catalog WHERE merchant_id=p_merchant AND sku=v_sku AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'POS draft: SKU unavailable'; END IF;
    v_line_sub := v_price::numeric * v_qty;
    v_line_tax := floor((v_line_sub*v_tax_rate + 5000)/10000);
    v_sub := v_sub + v_line_sub;
    v_tax := v_tax + v_line_tax;
    IF v_sub + v_tax > 9007199254740991 THEN
      RAISE EXCEPTION 'POS draft: amount exceeds safe JS integer'; END IF;

    v_line := v_line + 1;
    INSERT INTO pos_order_lines(merchant_id,order_id,line_number,sku_snapshot,
      description_snapshot,quantity,unit_price_cents,tax_basis_points,
      line_subtotal_cents,line_tax_cents)
    VALUES(p_merchant,v_order,v_line,v_sku,v_description,v_qty,v_price,v_tax_rate,
      v_line_sub::bigint,v_line_tax::bigint);
  END LOOP;

  UPDATE pos_orders SET subtotal_cents=v_sub::bigint, tax_cents=v_tax::bigint
  WHERE id=v_order AND merchant_id=p_merchant;
  INSERT INTO pos_audit_events(merchant_id,actor_id,order_id,action,context)
  VALUES(p_merchant,p_actor,v_order,'draft_created',
    jsonb_build_object('item_lines',v_line,'total_cents',v_sub+v_tax));
  RETURN v_order;
END;
$$;

-- Internal QA-only inventory adjustment: concurrent row update and immutable audit.
CREATE OR REPLACE FUNCTION pos_qa_adjust_stock(
  p_merchant uuid, p_location uuid, p_catalog uuid, p_actor uuid,
  p_idempotency_key text, p_delta integer, p_reason text
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_existing pos_inventory_movements%ROWTYPE;
  v_on_hand integer;
BEGIN
  IF p_merchant IS NULL OR p_location IS NULL OR p_catalog IS NULL OR p_actor IS NULL
     OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 180
     OR p_delta IS NULL OR p_delta = 0 OR p_delta NOT BETWEEN -10000 AND 10000
     OR p_reason NOT IN ('restock','manual_adjustment','stocktake')
  THEN RAISE EXCEPTION 'POS stock: invalid request'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM pos_operators WHERE id=p_actor AND merchant_id=p_merchant
      AND role IN ('owner','manager') AND disabled_at IS NULL
  ) THEN RAISE EXCEPTION 'POS stock: operator not permitted'; END IF;

  IF NOT EXISTS(SELECT 1 FROM pos_locations WHERE id=p_location AND merchant_id=p_merchant)
     OR NOT EXISTS(SELECT 1 FROM pos_catalog WHERE id=p_catalog AND merchant_id=p_merchant)
  THEN RAISE EXCEPTION 'POS stock: location or SKU not found in merchant'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pos-stock:'||p_merchant::text||':'||
    p_location::text||':'||p_idempotency_key,0));

  SELECT * INTO v_existing FROM pos_inventory_movements WHERE merchant_id=p_merchant
    AND location_id=p_location AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.catalog_id<>p_catalog OR v_existing.operator_id<>p_actor
       OR v_existing.delta<>p_delta OR v_existing.reason<>p_reason
    THEN RAISE EXCEPTION 'POS stock: idempotency key reused differently'; END IF;
    RETURN v_existing.resulting_on_hand;
  END IF;

  IF p_delta < 0 AND p_reason = 'restock' THEN
    RAISE EXCEPTION 'POS stock: restock cannot reduce quantity'; END IF;

  INSERT INTO pos_inventory_balances(merchant_id,location_id,catalog_id,on_hand)
  VALUES(p_merchant,p_location,p_catalog,p_delta)
  ON CONFLICT (merchant_id,location_id,catalog_id)
  DO UPDATE SET on_hand=pos_inventory_balances.on_hand+EXCLUDED.on_hand,
    updated_at=now()
  WHERE pos_inventory_balances.on_hand+EXCLUDED.on_hand BETWEEN 0 AND 100000000
  RETURNING on_hand INTO v_on_hand;

  IF NOT FOUND THEN RAISE EXCEPTION 'POS stock: not enough stock or max exceeded'; END IF;

  INSERT INTO pos_inventory_movements(merchant_id,location_id,catalog_id,operator_id,
    idempotency_key,delta,reason,resulting_on_hand)
  VALUES(p_merchant,p_location,p_catalog,p_actor,p_idempotency_key,p_delta,p_reason,v_on_hand);

  INSERT INTO pos_audit_events(merchant_id,actor_id,action,context) VALUES
  (p_merchant,p_actor,'stock_adjusted',jsonb_build_object('catalog_id',p_catalog,
    'location_id',p_location,'delta',p_delta,'new_stock',v_on_hand,'reason',p_reason));
  RETURN v_on_hand;
END;
$$;

-- Default postgres function EXECUTE privilege is PUBLIC: revoke it explicitly.
REVOKE ALL ON FUNCTION pos_qa_create_draft_order(uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION pos_qa_adjust_stock(uuid,uuid,uuid,uuid,text,integer,text) FROM PUBLIC;

COMMIT;
