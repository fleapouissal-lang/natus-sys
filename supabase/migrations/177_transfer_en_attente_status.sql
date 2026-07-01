-- Commandes directeur : statut « en_attente » sans déduction stock.
-- Hub / caisse confirment → « en_cours » + déduction source.

ALTER TYPE store_stock_transfer_status ADD VALUE IF NOT EXISTS 'en_attente';
ALTER TYPE hub_stock_transfer_status ADD VALUE IF NOT EXISTS 'en_attente';

CREATE OR REPLACE FUNCTION is_director_order_creator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role IN ('directeur', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION can_confirm_pending_hub_transfer(p_transfer hub_stock_transfers)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_is_hub BOOLEAN;
  v_city TEXT;
BEGIN
  SELECT COALESCE(s.is_hub, false)
  INTO v_from_is_hub
  FROM stores s
  WHERE s.id = p_transfer.from_store_id;

  IF v_from_is_hub THEN
    IF NOT is_hub_operator() THEN
      RETURN FALSE;
    END IF;
    SELECT city INTO v_city FROM profiles WHERE id = auth.uid();
    RETURN EXISTS (
      SELECT 1
      FROM stores s
      WHERE s.id = p_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    );
  END IF;

  RETURN can_manage_store_to_hub_transfer(p_transfer.from_store_id);
END;
$$;

CREATE OR REPLACE FUNCTION confirm_pending_store_stock_transfer(
  p_transfer_id UUID,
  p_items JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer store_stock_transfers%ROWTYPE;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer
  FROM store_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_transfer.status <> 'en_attente' THEN
    RAISE EXCEPTION 'Seule une commande en attente peut être confirmée';
  END IF;

  IF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
      RAISE EXCEPTION 'Aucun produit à transférer';
    END IF;

    DELETE FROM store_stock_transfer_items WHERE transfer_id = p_transfer_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
      v_qty := (v_item->>'quantity')::INTEGER;

      IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
        RAISE EXCEPTION 'Article invalide';
      END IF;

      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = v_transfer.from_store_id
        AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant au magasin source';
      END IF;

      INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (p_transfer_id, v_product_id, v_qty);
    END LOOP;
  ELSE
    FOR v_item IN
      SELECT product_id, quantity
      FROM store_stock_transfer_items
      WHERE transfer_id = p_transfer_id
    LOOP
      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = v_transfer.from_store_id
        AND si.product_id = v_item.product_id;

      IF COALESCE(v_current, 0) < v_item.quantity THEN
        RAISE EXCEPTION 'Stock insuffisant au magasin source';
      END IF;
    END LOOP;
  END IF;

  UPDATE store_stock_transfers
  SET status = 'en_cours'
  WHERE id = p_transfer_id;

  PERFORM deduct_store_transfer_source_stock(p_transfer_id, v_user_id, NULL);

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'to_store', v_to_name,
    'status', 'en_cours'
  );
END;
$$;

CREATE OR REPLACE FUNCTION confirm_pending_hub_stock_transfer(
  p_transfer_id UUID,
  p_items JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer hub_stock_transfers%ROWTYPE;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_dest_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_transfer.status <> 'en_attente' THEN
    RAISE EXCEPTION 'Seule une commande en attente peut être confirmée';
  END IF;

  IF NOT can_confirm_pending_hub_transfer(v_transfer) THEN
    RAISE EXCEPTION 'Non autorisé pour cette commande';
  END IF;

  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
      RAISE EXCEPTION 'Aucun produit à transférer';
    END IF;

    DELETE FROM hub_stock_transfer_items WHERE transfer_id = p_transfer_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
      v_qty := (v_item->>'quantity')::INTEGER;

      IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
        RAISE EXCEPTION 'Article invalide';
      END IF;

      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = v_transfer.from_store_id
        AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant à la source';
      END IF;

      INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (p_transfer_id, v_product_id, v_qty);
    END LOOP;
  ELSE
    FOR v_item IN
      SELECT product_id, quantity
      FROM hub_stock_transfer_items
      WHERE transfer_id = p_transfer_id
    LOOP
      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = v_transfer.from_store_id
        AND si.product_id = v_item.product_id;

      IF COALESCE(v_current, 0) < v_item.quantity THEN
        RAISE EXCEPTION 'Stock insuffisant à la source';
      END IF;
    END LOOP;
  END IF;

  UPDATE hub_stock_transfers
  SET status = 'en_cours'
  WHERE id = p_transfer_id;

  PERFORM deduct_hub_transfer_source_stock(p_transfer_id, v_user_id, NULL);

  SELECT name INTO v_dest_name FROM stores WHERE id = v_transfer.to_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'store', v_dest_name,
    'status', 'en_cours'
  );
END;
$$;

-- create_store_stock_transfer : directeur/admin → en_attente sans déduction
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
  v_status store_stock_transfer_status := 'en_cours';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_from_store_id IS NULL OR p_to_store_id IS NULL OR p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Magasins source et destination invalides';
  END IF;

  IF is_director_order_creator() THEN
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

  IF is_director_order_creator() THEN
    v_status := 'en_attente';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  INSERT INTO store_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (p_from_store_id, p_to_store_id, v_status, NULLIF(trim(p_notes), ''), v_user_id)
  RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

    IF v_status = 'en_cours' THEN
      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = p_from_store_id AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant au magasin source';
      END IF;
    END IF;

    INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  IF v_status = 'en_cours' THEN
    PERFORM deduct_store_transfer_source_stock(v_transfer_id, v_user_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'to_store', v_to_name,
    'status', v_status::text
  );
END;
$$;

-- create_store_to_hub_stock_transfer : directeur/admin → en_attente
CREATE OR REPLACE FUNCTION create_store_to_hub_stock_transfer(
  p_from_store_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_to_hub_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_hub_store_id UUID;
  v_hub_name TEXT;
  v_from_name TEXT;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_status hub_stock_transfer_status := 'en_cours';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(p_from_store_id) THEN
    RAISE EXCEPTION 'Non autorisé pour ce magasin source';
  END IF;

  IF NOT is_active_retail_store(p_from_store_id) THEN
    RAISE EXCEPTION 'Magasin source invalide';
  END IF;

  IF p_to_hub_store_id IS NOT NULL THEN
    SELECT s.id, s.name
    INTO v_hub_store_id, v_hub_name
    FROM stores s
    WHERE s.id = p_to_hub_store_id
      AND s.is_active = true
      AND COALESCE(s.is_hub, false) = true;

    IF v_hub_store_id IS NULL THEN
      RAISE EXCEPTION 'Dépôt destination invalide';
    END IF;
  ELSE
    v_hub_store_id := hub_depot_store_for_retail(p_from_store_id);

    IF v_hub_store_id IS NULL THEN
      RAISE EXCEPTION 'Aucun dépôt rattaché à ce magasin';
    END IF;

    SELECT name INTO v_hub_name FROM stores WHERE id = v_hub_store_id;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  IF is_director_order_creator() THEN
    v_status := 'en_attente';
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = p_from_store_id;

  INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (
    p_from_store_id,
    v_hub_store_id,
    v_status,
    COALESCE(NULLIF(trim(p_notes), ''), 'Retour dépôt depuis ' || COALESCE(v_from_name, 'magasin')),
    v_user_id
  )
  RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

    IF v_status = 'en_cours' THEN
      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = p_from_store_id
        AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant au magasin source';
      END IF;
    END IF;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  IF v_status = 'en_cours' THEN
    PERFORM deduct_hub_transfer_source_stock(v_transfer_id, v_user_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'hub_store', v_hub_name,
    'status', v_status::text
  );
END;
$$;

-- transfer_hub_stock : directeur/admin (hors opérateur hub) → en_attente
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
  v_status hub_stock_transfer_status := 'en_cours';
BEGIN
  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF is_director_order_creator() AND NOT is_hub_operator() THEN
    v_status := 'en_attente';
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
  VALUES (v_hub_store_id, p_to_store_id, v_status, NULLIF(trim(p_notes), ''), v_user_id)
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

    IF v_status = 'en_cours' THEN
      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = v_hub_store_id
        AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant à l''entrepôt';
      END IF;
    END IF;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  IF v_status = 'en_cours' THEN
    PERFORM deduct_hub_transfer_source_stock(v_transfer_id, v_user_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', v_status::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_director_order_creator() TO authenticated;
GRANT EXECUTE ON FUNCTION can_confirm_pending_hub_transfer(hub_stock_transfers) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_pending_store_stock_transfer(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_pending_hub_stock_transfer(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
