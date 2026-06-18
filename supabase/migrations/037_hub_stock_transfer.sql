-- Transferts de stock hub → magasins retail

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS related_store_id UUID REFERENCES stores(id);

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_type_check
  CHECK (type IN ('add', 'sale', 'adjustment', 'transfer'));

CREATE OR REPLACE FUNCTION transfer_hub_stock(
  p_to_store_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hub_user_id UUID := auth.uid();
  v_city TEXT;
  v_hub_store_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
  v_hub_name TEXT;
  v_note_out TEXT;
  v_note_in TEXT;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'Ville hub introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM hub_manager_assignments hma
    JOIN profiles p ON p.id = hma.manager_id
    WHERE hma.hub_user_id = v_hub_user_id
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Aucun gérant affecté — transfert impossible';
  END IF;

  SELECT s.id, s.name
  INTO v_hub_store_id, v_hub_name
  FROM stores s
  WHERE s.is_hub = true
    AND s.is_active = true
    AND s.city = v_city
  LIMIT 1;

  IF v_hub_store_id IS NULL THEN
    RAISE EXCEPTION 'Entrepôt hub introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = p_to_store_id
      AND s.is_active = true
      AND NOT s.is_hub
      AND s.city = v_city
  ) THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  v_note_out := COALESCE(NULLIF(trim(p_notes), ''), 'Transfert hub → ' || v_to_name);
  v_note_in := COALESCE(NULLIF(trim(p_notes), ''), 'Réception depuis ' || v_hub_name);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Produit invalide';
    END IF;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = v_hub_store_id
      AND si.product_id = v_product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant à l''entrepôt';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = v_hub_store_id
      AND product_id = v_product_id;

    INSERT INTO store_inventory (store_id, product_id, stock)
    VALUES (p_to_store_id, v_product_id, v_qty)
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id
    ) VALUES (
      v_product_id, -v_qty, 'transfer', v_note_out, v_hub_user_id, v_hub_store_id, p_to_store_id
    );

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id
    ) VALUES (
      v_product_id, v_qty, 'transfer', v_note_in, v_hub_user_id, p_to_store_id, v_hub_store_id
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'store', v_to_name);
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_hub_stock(UUID, JSONB, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Management read stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Management insert stock movements" ON stock_movements;

CREATE POLICY "Management read stock movements" ON stock_movements
  FOR SELECT TO authenticated
  USING (is_management() OR is_director() OR is_hub_operator());

CREATE POLICY "Management insert stock movements" ON stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (is_management() OR is_director() OR is_hub_operator());

NOTIFY pgrst, 'reload schema';
