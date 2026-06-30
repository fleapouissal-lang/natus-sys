-- Caissier : envoi magasin → magasin (source = magasin connecté, destination = tout retail actif).

CREATE OR REPLACE FUNCTION create_store_stock_transfer(
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
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_from_store_id IS NULL OR p_to_store_id IS NULL OR p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Magasins source et destination invalides';
  END IF;

  IF is_director_or_admin() THEN
    NULL;
  ELSIF is_manager() THEN
    IF NOT can_access_store(p_from_store_id) THEN
      RAISE EXCEPTION 'Magasin source hors périmètre';
    END IF;
    IF NOT is_active_retail_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination invalide';
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role = 'cashier'
      AND p.store_id = p_from_store_id
  ) THEN
    IF NOT is_active_retail_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination invalide';
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF NOT is_active_retail_store(p_from_store_id)
    OR NOT is_active_retail_store(p_to_store_id) THEN
    RAISE EXCEPTION 'Magasin retail invalide';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  INSERT INTO store_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (p_from_store_id, p_to_store_id, 'en_cours', NULLIF(trim(p_notes), ''), v_user_id)
  RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = p_from_store_id AND si.product_id = v_product_id;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant au magasin source';
    END IF;

    INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  PERFORM deduct_store_transfer_source_stock(v_transfer_id, v_user_id, NULL);

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'to_store', v_to_name,
    'status', 'en_cours'
  );
END;
$$;
