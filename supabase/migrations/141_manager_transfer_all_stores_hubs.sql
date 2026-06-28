-- Gérant : transferts vers tout magasin retail et tout dépôt hub actifs (page transferts).

CREATE OR REPLACE FUNCTION is_active_retail_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = p_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  );
$$;

CREATE OR REPLACE FUNCTION is_active_hub_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = p_store_id
      AND s.is_active = true
      AND COALESCE(s.is_hub, false) = true
  );
$$;

CREATE OR REPLACE FUNCTION can_manage_store_to_hub_transfer(p_from_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_from_store_id IS NOT NULL
    AND (
      is_director_or_admin()
      OR (is_manager() AND is_active_retail_store(p_from_store_id))
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'cashier'
          AND p.store_id = p_from_store_id
      )
    );
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
    IF NOT is_active_retail_store(p_from_store_id)
      OR NOT is_active_retail_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin retail invalide';
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

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'hub_store', v_hub_name,
    'status', 'en_cours'
  );
END;
$$;

DROP POLICY IF EXISTS store_stock_transfers_read ON store_stock_transfers;
CREATE POLICY store_stock_transfers_read ON store_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director_or_admin()
    OR (
      is_manager()
      AND (
        is_active_retail_store(from_store_id)
        OR is_active_retail_store(to_store_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
        AND p.store_id IN (from_store_id, to_store_id)
    )
  );

DROP POLICY IF EXISTS store_stock_transfer_items_read ON store_stock_transfer_items;
CREATE POLICY store_stock_transfer_items_read ON store_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_stock_transfers t
      WHERE t.id = transfer_id
        AND (
          is_director_or_admin()
          OR (
            is_manager()
            AND (
              is_active_retail_store(t.from_store_id)
              OR is_active_retail_store(t.to_store_id)
            )
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.is_active = true
              AND p.store_id IN (t.from_store_id, t.to_store_id)
          )
        )
    )
  );

GRANT EXECUTE ON FUNCTION is_active_retail_store(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_active_hub_store(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION mark_store_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR (NOT is_director_or_admin() AND NOT is_manager()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'en_cours' THEN
    RAISE EXCEPTION 'Seule une commande en cours peut être marquée prête';
  END IF;

  IF NOT is_director_or_admin()
    AND NOT is_active_retail_store(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  UPDATE store_stock_transfers
  SET status = 'pret', ready_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'pret');
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
  v_transfer store_stock_transfers%ROWTYPE;
  v_item RECORD;
  v_current INTEGER;
  v_to_name TEXT;
  v_note_out TEXT;
BEGIN
  IF v_user_id IS NULL OR (NOT is_director_or_admin() AND NOT is_manager()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être expédiée';
  END IF;

  IF NOT is_director_or_admin()
    AND NOT is_active_retail_store(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note_out := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Transfert magasin → ' || COALESCE(v_to_name, 'destination')
  );

  FOR v_item IN
    SELECT product_id, quantity FROM store_stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = v_transfer.from_store_id AND si.product_id = v_item.product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuffisant au magasin source';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_item.quantity
    WHERE store_id = v_transfer.from_store_id AND product_id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, store_transfer_id
    ) VALUES (
      v_item.product_id, -v_item.quantity, 'transfer', v_note_out, v_user_id,
      v_transfer.from_store_id, v_transfer.to_store_id, p_transfer_id
    );
  END LOOP;

  UPDATE store_stock_transfers
  SET status = 'en_livraison', shipped_at = NOW(), shipped_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'en_livraison');
END;
$$;

CREATE OR REPLACE FUNCTION mark_store_transfer_delivered(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR (NOT is_director_or_admin() AND NOT is_manager()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'en_livraison' THEN
    RAISE EXCEPTION 'Seule une commande en livraison peut être marquée livrée';
  END IF;

  IF NOT is_director_or_admin()
    AND NOT is_active_retail_store(v_transfer.to_store_id) THEN
    RAISE EXCEPTION 'Magasin destination hors périmètre';
  END IF;

  UPDATE store_stock_transfers
  SET status = 'livre', delivered_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'livre');
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

  IF v_transfer.status NOT IN ('livre', 'en_livraison') THEN
    RAISE EXCEPTION 'Ce transfert ne peut pas être reçu dans son état actuel';
  END IF;

  IF v_role = 'cashier' THEN
    IF v_store_id IS NULL OR v_store_id <> v_transfer.to_store_id THEN
      RAISE EXCEPTION 'Ce transfert ne concerne pas votre magasin';
    END IF;
  ELSIF v_role = 'manager' AND NOT is_director_or_admin() THEN
    IF NOT is_active_retail_store(v_transfer.to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination hors périmètre';
    END IF;
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = v_transfer.from_store_id;
  v_note_in := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Réception depuis ' || COALESCE(v_from_name, 'magasin source')
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
      AND is_active_retail_store(to_store_id)
    )
    OR (
      is_management()
      AND is_active_retail_store(from_store_id)
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
            AND is_active_retail_store(t.to_store_id)
          )
          OR (
            is_management()
            AND is_active_retail_store(t.from_store_id)
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

NOTIFY pgrst, 'reload schema';
