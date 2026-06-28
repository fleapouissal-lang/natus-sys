-- Directeur / admin : création et gestion des transferts hub (toutes destinations actives).

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
  v_user_id UUID := auth.uid();
  v_city TEXT;
  v_hub_store_id UUID;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
BEGIN
  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF is_director_or_admin() THEN
    IF p_from_hub_store_id IS NULL THEN
      RAISE EXCEPTION 'Entrepôt source requis';
    END IF;

    SELECT s.id
    INTO v_hub_store_id
    FROM stores s
    WHERE s.id = p_from_hub_store_id
      AND s.is_hub = true
      AND s.is_active = true;
  ELSE
    SELECT city INTO v_city FROM profiles WHERE id = v_user_id;
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
  VALUES (v_hub_store_id, p_to_store_id, 'en_cours', NULLIF(trim(p_notes), ''), v_user_id)
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

CREATE OR REPLACE FUNCTION mark_hub_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'en_cours' THEN
    RAISE EXCEPTION 'Seule une commande en cours peut être marquée prête';
  END IF;

  IF is_hub_operator() AND NOT is_director_or_admin() THEN
    SELECT city INTO v_city FROM profiles WHERE id = v_user_id;

    IF NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  END IF;

  UPDATE hub_stock_transfers
  SET status = 'pret', ready_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'pret');
END;
$$;

CREATE OR REPLACE FUNCTION assign_hub_transfer_livreur(
  p_transfer_id UUID,
  p_livreur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être assignée à un livreur';
  END IF;

  IF is_hub_operator() AND NOT is_director_or_admin() THEN
    SELECT city INTO v_city FROM profiles WHERE id = v_user_id;

    IF NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  END IF;

  UPDATE hub_stock_transfers
  SET assigned_livreur_id = p_livreur_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';
