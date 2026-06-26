-- Compte hub = dépôt ville autonome, sans gérant affecté requis pour transférer

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
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
  v_hub_name TEXT;
  v_note_out TEXT;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'Ville hub introuvable';
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

  INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (v_hub_store_id, p_to_store_id, 'sent', NULLIF(trim(p_notes), ''), v_hub_user_id)
  RETURNING id INTO v_transfer_id;

  v_note_out := COALESCE(NULLIF(trim(p_notes), ''), 'Envoi hub → ' || v_to_name || ' (en attente réception)');

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

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
    ) VALUES (
      v_product_id, -v_qty, 'transfer', v_note_out, v_hub_user_id, v_hub_store_id, p_to_store_id, v_transfer_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', 'sent'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_hub_stock(UUID, JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
