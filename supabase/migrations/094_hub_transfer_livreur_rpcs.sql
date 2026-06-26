-- Étape 2 : workflow livreur + déduction stock différée

UPDATE hub_stock_transfers
SET status = 'en_livraison'
WHERE status = 'sent';

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
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'Ville hub introuvable';
  END IF;

  SELECT s.id
  INTO v_hub_store_id
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
    FROM hub_store_assignments hsa
    JOIN stores s ON s.id = hsa.store_id
    WHERE hsa.hub_user_id = v_hub_user_id
      AND hsa.store_id = p_to_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin destination non autorisé pour ce dépôt';
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

CREATE OR REPLACE FUNCTION mark_hub_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hub_user_id UUID := auth.uid();
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;

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

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = v_transfer.from_store_id
      AND s.is_hub = true
      AND s.city = v_city
  ) THEN
    RAISE EXCEPTION 'Transfert hors périmètre dépôt';
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
  v_hub_user_id UUID := auth.uid();
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;

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

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = v_transfer.from_store_id
      AND s.is_hub = true
      AND s.city = v_city
  ) THEN
    RAISE EXCEPTION 'Transfert hors périmètre dépôt';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_livreur_id
      AND p.role = 'livreur'
      AND p.is_active = true
      AND p.city = v_city
  ) THEN
    RAISE EXCEPTION 'Livreur invalide';
  END IF;

  UPDATE hub_stock_transfers
  SET assigned_livreur_id = p_livreur_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'assigned_livreur_id', p_livreur_id);
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
  v_item RECORD;
  v_current INTEGER;
  v_to_name TEXT;
  v_note_out TEXT;
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

  IF v_role = 'livreur' THEN
    IF v_transfer.assigned_livreur_id <> v_user_id THEN
      RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
    END IF;
  ELSIF v_role = 'hub' THEN
    IF NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note_out := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Prise en charge hub → ' || COALESCE(v_to_name, 'magasin') || ' (en livraison)'
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
      RAISE EXCEPTION 'Stock insuffisant à l''entrepôt';
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
      v_user_id,
      v_transfer.from_store_id,
      v_transfer.to_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE hub_stock_transfers
  SET
    status = 'en_livraison',
    picked_up_at = NOW(),
    picked_up_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'en_livraison');
END;
$$;

CREATE OR REPLACE FUNCTION confirm_hub_stock_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_store_id UUID;
  v_role user_role;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
  v_item_count INTEGER;
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles
  WHERE id = v_user_id AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin', 'livreur') THEN
    RAISE EXCEPTION 'Non autorisé pour confirmer la réception';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status NOT IN ('en_livraison', 'sent') THEN
    RAISE EXCEPTION 'Ce transfert ne peut pas être reçu dans son état actuel';
  END IF;

  IF v_role = 'cashier' THEN
    IF v_store_id IS NULL OR v_store_id <> v_transfer.to_store_id THEN
      RAISE EXCEPTION 'Ce transfert ne concerne pas votre magasin';
    END IF;
  ELSIF v_role = 'livreur' THEN
    IF v_transfer.assigned_livreur_id IS NULL OR v_transfer.assigned_livreur_id <> v_user_id THEN
      RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
    END IF;
  ELSIF v_role = 'manager' THEN
    IF NOT EXISTS (
      SELECT 1 FROM stores s
      JOIN profiles p ON p.id = v_user_id
      WHERE s.id = v_transfer.to_store_id AND s.city = p.city
    ) THEN
      RAISE EXCEPTION 'Magasin hors de votre périmètre';
    END IF;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM hub_stock_transfer_items
  WHERE transfer_id = p_transfer_id;

  IF COALESCE(v_item_count, 0) = 0 THEN
    RAISE EXCEPTION 'Transfert sans articles — contactez le hub';
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = v_transfer.from_store_id;
  v_note_in := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Réception depuis ' || COALESCE(v_from_name, 'entrepôt hub')
  );

  FOR v_item IN
    SELECT product_id, quantity
    FROM hub_stock_transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    UPDATE store_inventory
    SET stock = stock + v_item.quantity
    WHERE store_id = v_transfer.to_store_id
      AND product_id = v_item.product_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
      INSERT INTO store_inventory (store_id, product_id, stock)
      VALUES (v_transfer.to_store_id, v_item.product_id, v_item.quantity);
    END IF;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
    ) VALUES (
      v_item.product_id,
      v_item.quantity,
      'transfer',
      v_note_in,
      v_user_id,
      v_transfer.to_store_id,
      v_transfer.from_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE hub_stock_transfers
  SET
    status = 'received',
    received_by = v_user_id,
    received_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'received',
    'items_credited', v_item_count
  );
END;
$$;

DROP POLICY IF EXISTS hub_stock_transfers_livreur_read ON hub_stock_transfers;
CREATE POLICY hub_stock_transfers_livreur_read ON hub_stock_transfers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'livreur'
        AND p.id = hub_stock_transfers.assigned_livreur_id
    )
  );

DROP POLICY IF EXISTS hub_stock_transfer_items_read ON hub_stock_transfer_items;
CREATE POLICY hub_stock_transfer_items_read ON hub_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM hub_stock_transfers t
      WHERE t.id = transfer_id
        AND (
          is_director()
          OR (
            is_hub_operator()
            AND EXISTS (
              SELECT 1 FROM stores s
              WHERE s.id = t.from_store_id AND s.city = hub_user_city()
            )
          )
          OR (
            is_management()
            AND EXISTS (
              SELECT 1 FROM stores s
              WHERE s.id = t.to_store_id AND s.city = management_city()
            )
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'cashier'
              AND p.store_id = t.to_store_id
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'livreur'
              AND p.id = t.assigned_livreur_id
          )
        )
    )
  );

GRANT EXECUTE ON FUNCTION transfer_hub_stock(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_hub_transfer_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_hub_transfer_livreur(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pickup_hub_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_hub_stock_transfer(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
