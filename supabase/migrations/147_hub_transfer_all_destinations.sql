-- Hub : envoi vers tout magasin retail actif et tout dépôt hub actif (source = dépôt opérateur).

CREATE OR REPLACE FUNCTION transfer_hub_stock(
  p_to_store_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_from_hub_store_id UUID DEFAULT NULL
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
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'Ville hub introuvable';
  END IF;

  IF p_from_hub_store_id IS NOT NULL THEN
    SELECT s.id
    INTO v_hub_store_id
    FROM stores s
    WHERE s.id = p_from_hub_store_id
      AND s.is_hub = true
      AND s.is_active = true
      AND s.city = v_city;
  ELSE
    SELECT s.id
    INTO v_hub_store_id
    FROM stores s
    WHERE s.is_hub = true
      AND s.is_active = true
      AND s.city = v_city
    ORDER BY s.name
    LIMIT 1;
  END IF;

  IF v_hub_store_id IS NULL THEN
    RAISE EXCEPTION 'Entrepôt hub introuvable';
  END IF;

  IF p_to_store_id IS NULL OR p_to_store_id = v_hub_store_id THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  IF NOT is_active_retail_store(p_to_store_id)
    AND NOT is_active_hub_store(p_to_store_id) THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (v_hub_store_id, p_to_store_id, 'en_cours', NULLIF(trim(p_notes), ''), v_hub_user_id)
  RETURNING id INTO v_transfer_id;

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
      AND si.product_id = v_product_id;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant à l''entrepôt';
    END IF;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', 'en_cours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_hub_stock(UUID, JSONB, TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
