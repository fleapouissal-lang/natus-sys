-- Transfert de stock entre magasins retail (gérant / directeur)

CREATE OR REPLACE FUNCTION transfer_store_stock(
  p_from_store_id UUID,
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
  v_user_id UUID := auth.uid();
  v_from_name TEXT;
  v_to_name TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_note_out TEXT;
  v_note_in TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() AND NOT is_manager() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_from_store_id IS NULL OR p_to_store_id IS NULL THEN
    RAISE EXCEPTION 'Magasins source et destination requis';
  END IF;

  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Les magasins source et destination doivent être différents';
  END IF;

  IF NOT can_access_store(p_from_store_id) OR NOT can_access_store(p_to_store_id) THEN
    RAISE EXCEPTION 'Magasin hors périmètre';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_from_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin source invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_to_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  IF is_manager() AND NOT is_director() THEN
    IF (SELECT city FROM stores WHERE id = p_from_store_id)
      <> (SELECT city FROM stores WHERE id = p_to_store_id) THEN
      RAISE EXCEPTION 'Transfert inter-ville non autorisé';
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = p_from_store_id;
  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  v_note_out := COALESCE(NULLIF(trim(p_notes), ''), 'Transfert → ' || v_to_name);
  v_note_in := COALESCE(NULLIF(trim(p_notes), ''), 'Réception depuis ' || v_from_name);

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
    WHERE si.store_id = p_from_store_id
      AND si.product_id = v_product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant au magasin source';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = p_from_store_id
      AND product_id = v_product_id;

    INSERT INTO store_inventory (store_id, product_id, stock)
    VALUES (p_to_store_id, v_product_id, v_qty)
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id
    ) VALUES (
      v_product_id, -v_qty, 'transfer', v_note_out, v_user_id, p_from_store_id, p_to_store_id
    );

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id
    ) VALUES (
      v_product_id, v_qty, 'transfer', v_note_in, v_user_id, p_to_store_id, p_from_store_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'from_store', v_from_name,
    'to_store', v_to_name
  );
END;
$$;

REVOKE ALL ON FUNCTION transfer_store_stock(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_store_stock(UUID, UUID, JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
