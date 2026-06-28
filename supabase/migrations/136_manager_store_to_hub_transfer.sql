-- Gérant : envoyer du stock d'un magasin vers le dépôt hub

CREATE OR REPLACE FUNCTION can_manage_store_to_hub_transfer(p_from_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_from_store_id IS NOT NULL
    AND hub_depot_store_for_retail(p_from_store_id) IS NOT NULL
    AND (
      is_director_or_admin()
      OR (is_manager() AND can_access_store(p_from_store_id))
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'cashier'
          AND p.store_id = p_from_store_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION create_store_to_hub_stock_transfer(
  p_from_store_id UUID,
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
  v_hub_store_id UUID;
  v_hub_name TEXT;
  v_from_name TEXT;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_depot_city TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(p_from_store_id) THEN
    RAISE EXCEPTION 'Non autorisé ou dépôt introuvable pour ce magasin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_from_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin source invalide';
  END IF;

  v_hub_store_id := hub_depot_store_for_retail(p_from_store_id);
  v_depot_city := hub_depot_city_for_retail(p_from_store_id);

  IF v_hub_store_id IS NULL OR v_depot_city IS NULL THEN
    RAISE EXCEPTION 'Aucun dépôt rattaché à ce magasin';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = p_from_store_id;
  SELECT name INTO v_hub_name FROM stores WHERE id = v_hub_store_id;

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

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'hub_store', v_hub_name,
    'status', 'en_cours'
  );
END;
$$;

CREATE OR REPLACE FUNCTION mark_store_to_hub_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_to_is_hub BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer FROM hub_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF NOT v_to_is_hub THEN
    RAISE EXCEPTION 'Ce transfert n''est pas un retour dépôt';
  END IF;

  IF v_transfer.status <> 'en_cours' THEN
    RAISE EXCEPTION 'Seule une commande en cours peut être marquée prête';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  UPDATE hub_stock_transfers
  SET status = 'pret', ready_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'pret');
END;
$$;

CREATE OR REPLACE FUNCTION assign_store_to_hub_transfer_livreur(
  p_transfer_id UUID,
  p_livreur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_to_is_hub BOOLEAN;
  v_depot_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Livreur requis';
  END IF;

  SELECT * INTO v_transfer FROM hub_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF NOT v_to_is_hub THEN
    RAISE EXCEPTION 'Ce transfert n''est pas un retour dépôt';
  END IF;

  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être assignée à un livreur';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  v_depot_city := hub_depot_city_for_retail(v_transfer.from_store_id);

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_livreur_id
      AND p.role = 'livreur'
      AND p.is_active = true
      AND p.city = v_depot_city
  ) THEN
    RAISE EXCEPTION 'Livreur invalide pour ce dépôt';
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
  v_from_is_hub BOOLEAN;
  v_to_is_hub BOOLEAN;
  v_item RECORD;
  v_current INTEGER;
  v_dest_name TEXT;
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

  SELECT name INTO v_dest_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note_out := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    CASE
      WHEN v_from_is_hub THEN
        'Prise en charge hub → ' || COALESCE(v_dest_name, 'magasin')
      ELSE
        'Prise en charge magasin → dépôt (' || COALESCE(v_dest_name, 'entrepôt') || ')'
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

DROP POLICY IF EXISTS hub_stock_transfers_hub_read ON hub_stock_transfers;
CREATE POLICY hub_stock_transfers_hub_read ON hub_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (
      is_hub_operator()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = from_store_id AND s.city = hub_user_city()
      )
    )
    OR (
      is_management()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = to_store_id AND s.city = management_city()
      )
    )
    OR (
      is_management()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = from_store_id
          AND NOT COALESCE(s.is_hub, false)
          AND can_access_store(s.id)
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'cashier'
          AND p.store_id = hub_stock_transfers.to_store_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'cashier'
          AND p.store_id = hub_stock_transfers.from_store_id
      )
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
          OR (
            is_management()
            AND EXISTS (
              SELECT 1 FROM stores s
              WHERE s.id = t.from_store_id
                AND NOT COALESCE(s.is_hub, false)
                AND can_access_store(s.id)
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
              AND p.role = 'cashier'
              AND p.store_id = t.from_store_id
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

GRANT EXECUTE ON FUNCTION can_manage_store_to_hub_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_store_to_hub_stock_transfer(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_store_to_hub_transfer_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_store_to_hub_transfer_livreur(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
