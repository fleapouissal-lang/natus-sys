-- Tous les rôles créent en « en_attente » sans déduction stock.
-- Caisse ou hub prépare depuis Mes commandes → « en_cours » + déduction source.

-- create_store_stock_transfer
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
  v_to_name TEXT;
  v_status store_stock_transfer_status := 'en_attente';
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

    INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'to_store', v_to_name,
    'status', v_status::text
  );
END;
$$;

-- create_store_to_hub_stock_transfer
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
  v_status hub_stock_transfer_status := 'en_attente';
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

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'hub_store', v_hub_name,
    'status', v_status::text
  );
END;
$$;

-- transfer_hub_stock
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
  v_to_name TEXT;
  v_status hub_stock_transfer_status := 'en_attente';
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

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', v_status::text
  );
END;
$$;

-- create_cashier_restock_order
CREATE OR REPLACE FUNCTION create_cashier_restock_order(
  p_source_id UUID,
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
  v_role user_role;
  v_dest_store_id UUID;
  v_source_is_hub BOOLEAN;
  v_source_active BOOLEAN;
  v_source_name TEXT;
  v_dest_name TEXT;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_kind TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_dest_store_id
  FROM profiles WHERE id = v_user_id AND is_active = true;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_dest_store_id IS NULL THEN
    RAISE EXCEPTION 'Aucun magasin associé à votre compte';
  END IF;

  IF NOT is_active_retail_store(v_dest_store_id) THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  IF p_source_id IS NULL OR p_source_id = v_dest_store_id THEN
    RAISE EXCEPTION 'Source de commande invalide';
  END IF;

  SELECT COALESCE(s.is_hub, false), s.is_active, s.name
  INTO v_source_is_hub, v_source_active, v_source_name
  FROM stores s WHERE s.id = p_source_id;

  IF NOT FOUND OR v_source_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Source de commande inactive ou introuvable';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à commander';
  END IF;

  SELECT name INTO v_dest_name FROM stores WHERE id = v_dest_store_id;

  IF v_source_is_hub THEN
    v_kind := 'hub';

    INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
    VALUES (
      p_source_id,
      v_dest_store_id,
      'en_attente',
      COALESCE(
        NULLIF(trim(p_notes), ''),
        'Commande caisse — ' || COALESCE(v_dest_name, 'magasin')
          || ' depuis dépôt ' || COALESCE(v_source_name, '')
      ),
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

      INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (v_transfer_id, v_product_id, v_qty);
    END LOOP;
  ELSE
    IF NOT is_active_retail_store(p_source_id) THEN
      RAISE EXCEPTION 'Magasin source invalide';
    END IF;

    v_kind := 'store';

    INSERT INTO store_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
    VALUES (
      p_source_id,
      v_dest_store_id,
      'en_attente',
      COALESCE(
        NULLIF(trim(p_notes), ''),
        'Commande caisse — ' || COALESCE(v_dest_name, 'magasin')
          || ' depuis ' || COALESCE(v_source_name, '')
      ),
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

      INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (v_transfer_id, v_product_id, v_qty);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'kind', v_kind,
    'source', v_source_name,
    'to_store', v_dest_name,
    'status', 'en_attente'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
