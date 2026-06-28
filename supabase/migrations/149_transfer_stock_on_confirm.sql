-- Transferts : déduire le stock source à la confirmation (création commande),
-- créditer la destination uniquement à la réception validée (statut livré).

ALTER TABLE store_stock_transfers
  ADD COLUMN IF NOT EXISTS source_stock_deducted_at TIMESTAMPTZ;

ALTER TABLE hub_stock_transfers
  ADD COLUMN IF NOT EXISTS source_stock_deducted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION deduct_store_transfer_source_stock(
  p_transfer_id UUID,
  p_user_id UUID,
  p_note_override TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
  v_item RECORD;
  v_current INTEGER;
  v_to_name TEXT;
  v_note_out TEXT;
BEGIN
  SELECT * INTO v_transfer
  FROM store_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.source_stock_deducted_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note_out := COALESCE(
    p_note_override,
    NULLIF(trim(v_transfer.notes), ''),
    'Transfert confirmé magasin → ' || COALESCE(v_to_name, 'destination')
  );

  FOR v_item IN
    SELECT product_id, quantity
    FROM store_stock_transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = v_transfer.from_store_id
      AND si.product_id = v_item.product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuffisant au magasin source';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_item.quantity
    WHERE store_id = v_transfer.from_store_id
      AND product_id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, store_transfer_id
    ) VALUES (
      v_item.product_id,
      -v_item.quantity,
      'transfer',
      v_note_out,
      p_user_id,
      v_transfer.from_store_id,
      v_transfer.to_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE store_stock_transfers
  SET source_stock_deducted_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_hub_transfer_source_stock(
  p_transfer_id UUID,
  p_user_id UUID,
  p_note_override TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_is_hub BOOLEAN;
  v_item RECORD;
  v_current INTEGER;
  v_dest_name TEXT;
  v_note_out TEXT;
BEGIN
  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.source_stock_deducted_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_from_is_hub
  FROM stores s
  WHERE s.id = v_transfer.from_store_id;

  SELECT name INTO v_dest_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note_out := COALESCE(
    p_note_override,
    NULLIF(trim(v_transfer.notes), ''),
    CASE
      WHEN v_from_is_hub THEN
        'Transfert confirmé hub → ' || COALESCE(v_dest_name, 'destination')
      ELSE
        'Transfert confirmé magasin → dépôt (' || COALESCE(v_dest_name, 'entrepôt') || ')'
    END
  );

  FOR v_item IN
    SELECT product_id, quantity
    FROM hub_stock_transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = v_transfer.from_store_id
      AND si.product_id = v_item.product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuffisant à la source';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_item.quantity
    WHERE store_id = v_transfer.from_store_id
      AND product_id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
    ) VALUES (
      v_item.product_id,
      -v_item.quantity,
      'transfer',
      v_note_out,
      p_user_id,
      v_transfer.from_store_id,
      v_transfer.to_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE hub_stock_transfers
  SET source_stock_deducted_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

-- Transferts déjà expédiés : le stock source avait été déduit à l'expédition.
UPDATE store_stock_transfers
SET source_stock_deducted_at = COALESCE(shipped_at, picked_up_at, sent_at, NOW())
WHERE source_stock_deducted_at IS NULL
  AND status IN ('en_livraison', 'livre', 'received');

UPDATE hub_stock_transfers
SET source_stock_deducted_at = COALESCE(picked_up_at, NOW())
WHERE source_stock_deducted_at IS NULL
  AND status IN ('en_livraison', 'livre', 'received', 'sent');

-- Commandes en cours / prêtes : appliquer la déduction rétroactive si possible.
DO $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, created_by
    FROM store_stock_transfers
    WHERE source_stock_deducted_at IS NULL
      AND status IN ('en_cours', 'pret')
  LOOP
    BEGIN
      PERFORM deduct_store_transfer_source_stock(v_row.id, v_row.created_by, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Déduction source ignorée pour transfert magasin %: %', v_row.id, SQLERRM;
    END;
  END LOOP;

  FOR v_row IN
    SELECT id, created_by
    FROM hub_stock_transfers
    WHERE source_stock_deducted_at IS NULL
      AND status IN ('en_cours', 'pret')
  LOOP
    BEGIN
      PERFORM deduct_hub_transfer_source_stock(v_row.id, v_row.created_by, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Déduction source ignorée pour transfert hub %: %', v_row.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

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

  IF NOT is_director_or_admin() AND NOT is_manager() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_from_store_id IS NULL OR p_to_store_id IS NULL OR p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Magasins source et destination invalides';
  END IF;

  IF is_manager() AND NOT is_director_or_admin() THEN
    IF NOT can_access_store(p_from_store_id) THEN
      RAISE EXCEPTION 'Magasin source hors périmètre';
    END IF;
    IF NOT is_active_retail_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination invalide';
    END IF;
  ELSIF NOT is_director_or_admin() THEN
    IF NOT can_access_store(p_from_store_id) OR NOT can_access_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin hors périmètre';
    END IF;
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
    'en_cours',
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

    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = p_from_store_id
      AND si.product_id = v_product_id;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant au magasin source';
    END IF;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  PERFORM deduct_hub_transfer_source_stock(v_transfer_id, v_user_id, NULL);

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'hub_store', v_hub_name,
    'status', 'en_cours'
  );
END;
$$;

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

  PERFORM deduct_hub_transfer_source_stock(v_transfer_id, v_user_id, NULL);

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', 'en_cours'
  );
END;
$$;

CREATE OR REPLACE FUNCTION ship_store_stock_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id AND is_active = true;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être remise au livreur';
  END IF;

  IF v_transfer.assigned_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Aucun livreur assigné à cette commande';
  END IF;

  IF v_role = 'livreur' THEN
    IF v_transfer.assigned_livreur_id <> v_user_id THEN
      RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
    END IF;
  ELSIF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  IF v_transfer.source_stock_deducted_at IS NULL THEN
    PERFORM deduct_store_transfer_source_stock(
      p_transfer_id,
      v_user_id,
      'Transfert magasin — colis remis au livreur'
    );
  END IF;

  UPDATE store_stock_transfers
  SET
    status = 'en_livraison',
    shipped_at = NOW(),
    shipped_by = v_user_id,
    picked_up_at = NOW(),
    picked_up_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'en_livraison');
END;
$$;

CREATE OR REPLACE FUNCTION pickup_hub_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_is_hub BOOLEAN;
  v_to_is_hub BOOLEAN;
BEGIN
  SELECT role, city INTO v_role, v_city
  FROM profiles
  WHERE id = v_user_id AND is_active = true;

  IF v_role IS NULL THEN
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
    RAISE EXCEPTION 'Seule une commande prête peut être prise en charge';
  END IF;

  IF v_transfer.assigned_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Aucun livreur assigné à cette commande';
  END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_from_is_hub
  FROM stores s
  WHERE s.id = v_transfer.from_store_id;

  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF v_role = 'livreur' THEN
    IF v_transfer.assigned_livreur_id <> v_user_id THEN
      RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
    END IF;
  ELSIF v_role = 'hub' THEN
    IF v_from_is_hub AND NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  ELSIF v_to_is_hub THEN
    IF NOT can_manage_store_to_hub_transfer(v_transfer.from_store_id) THEN
      RAISE EXCEPTION 'Non autorisé pour ce magasin';
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_transfer.source_stock_deducted_at IS NULL THEN
    PERFORM deduct_hub_transfer_source_stock(
      p_transfer_id,
      v_user_id,
      'Transfert — colis remis au livreur'
    );
  END IF;

  UPDATE hub_stock_transfers
  SET
    status = 'en_livraison',
    picked_up_at = NOW(),
    picked_up_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'en_livraison');
END;
$$;

CREATE OR REPLACE FUNCTION confirm_store_stock_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_store_id UUID;
  v_transfer store_stock_transfers%ROWTYPE;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles WHERE id = v_user_id AND is_active = true;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé pour confirmer la réception';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;

  IF v_transfer.status <> 'livre' THEN
    RAISE EXCEPTION 'Le livreur doit d''abord marquer la commande comme livrée';
  END IF;

  IF v_role = 'cashier' THEN
    IF v_store_id IS NULL OR v_store_id <> v_transfer.to_store_id THEN
      RAISE EXCEPTION 'Ce transfert ne concerne pas votre magasin';
    END IF;
  ELSIF v_role = 'manager' AND NOT is_director_or_admin() THEN
    IF NOT can_access_store(v_transfer.to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination hors périmètre';
    END IF;
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = v_transfer.from_store_id;
  v_note_in := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Réception validée depuis ' || COALESCE(v_from_name, 'magasin source')
  );

  FOR v_item IN
    SELECT product_id, quantity FROM store_stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    UPDATE store_inventory
    SET stock = stock + v_item.quantity
    WHERE store_id = v_transfer.to_store_id AND product_id = v_item.product_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      INSERT INTO store_inventory (store_id, product_id, stock)
      VALUES (v_transfer.to_store_id, v_item.product_id, v_item.quantity);
    END IF;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, store_transfer_id
    ) VALUES (
      v_item.product_id, v_item.quantity, 'transfer', v_note_in, v_user_id,
      v_transfer.to_store_id, v_transfer.from_store_id, p_transfer_id
    );
  END LOOP;

  UPDATE store_stock_transfers
  SET status = 'received', received_by = v_user_id, received_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'received');
END;
$$;

CREATE OR REPLACE FUNCTION mark_store_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'en_cours' THEN
    RAISE EXCEPTION 'Seule une commande en cours peut être marquée prête';
  END IF;

  IF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  UPDATE store_stock_transfers
  SET status = 'pret', ready_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'pret');
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_store_transfer_source_stock(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_hub_transfer_source_stock(UUID, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
