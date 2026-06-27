-- Livreur rattaché à une ville (plus à un magasin) + transferts retour magasin → dépôt

DROP INDEX IF EXISTS idx_one_active_livreur_per_store;

UPDATE profiles p
SET city = s.city
FROM stores s
WHERE p.role = 'livreur'
  AND p.store_id = s.id
  AND (p.city IS NULL OR p.city = '');

UPDATE profiles
SET store_id = NULL
WHERE role = 'livreur';

ALTER TABLE hub_stock_transfers
  ADD COLUMN IF NOT EXISTS shopify_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_transfer_shopify_return_active
  ON hub_stock_transfers (shopify_order_id)
  WHERE shopify_order_id IS NOT NULL AND status NOT IN ('received');

-- Commandes Shopify : livreur voit ses affectations dans sa ville
DROP POLICY IF EXISTS "Livreur read assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur read assigned shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
    AND city = (SELECT city FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Livreur update assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur update assigned shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
    AND city = (SELECT city FROM profiles WHERE id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
    AND city = (SELECT city FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

-- Profils livreur : gérant gère par ville
DROP POLICY IF EXISTS "Managers read city profiles" ON profiles;
CREATE POLICY "Managers read city profiles" ON profiles
  FOR SELECT USING (
    is_manager() AND (
      id = auth.uid()
      OR (
        role = 'cashier'
        AND store_in_management_city(store_id)
      )
      OR (
        role = 'livreur'
        AND city = management_city()
      )
    )
  );

DROP POLICY IF EXISTS "Managers update city store staff" ON profiles;
CREATE POLICY "Managers update city store staff" ON profiles
  FOR UPDATE USING (
    is_manager()
    AND (
      (role = 'cashier' AND store_in_management_city(store_id))
      OR (role = 'livreur' AND city = management_city())
    )
  );

CREATE OR REPLACE FUNCTION create_store_return_to_hub_transfer(
  p_order_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order shopify_orders%ROWTYPE;
  v_hub_store_id UUID;
  v_livreur_id UUID;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  SELECT * INTO v_order
  FROM shopify_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.workflow_status <> 'returned' THEN
    RAISE EXCEPTION 'Commande non en retour';
  END IF;

  IF v_order.return_received_at IS NULL THEN
    RAISE EXCEPTION 'Réception magasin requise avant transfert dépôt';
  END IF;

  IF v_order.store_id IS NULL THEN
    RAISE EXCEPTION 'Commande sans magasin';
  END IF;

  IF EXISTS (
    SELECT 1 FROM hub_stock_transfers
    WHERE shopify_order_id = p_order_id
      AND status NOT IN ('received')
  ) THEN
    RAISE EXCEPTION 'Transfert retour déjà en cours pour cette commande';
  END IF;

  SELECT s.id INTO v_hub_store_id
  FROM stores s
  WHERE s.is_hub = true
    AND s.is_active = true
    AND s.city = v_order.city
  LIMIT 1;

  IF v_hub_store_id IS NULL THEN
    RAISE EXCEPTION 'Entrepôt introuvable pour cette ville';
  END IF;

  v_livreur_id := v_order.assigned_livreur_id;

  IF v_livreur_id IS NULL THEN
    SELECT id INTO v_livreur_id
    FROM profiles
    WHERE role = 'livreur'
      AND is_active = true
      AND city = v_order.city
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO hub_stock_transfers (
    from_store_id,
    to_store_id,
    status,
    notes,
    created_by,
    assigned_livreur_id,
    shopify_order_id,
    ready_at
  )
  VALUES (
    v_order.store_id,
    v_hub_store_id,
    'pret',
    'Retour commande ' || COALESCE(v_order.order_number, p_order_id::TEXT),
    auth.uid(),
    v_livreur_id,
    p_order_id,
    NOW()
  )
  RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Article invalide dans le transfert retour';
    END IF;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'assigned_livreur_id', v_livreur_id
  );
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
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_to_is_hub BOOLEAN;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
  v_item_count INTEGER;
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id, city INTO v_role, v_store_id, v_city
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

  IF v_transfer.status NOT IN ('livre', 'sent') THEN
    RAISE EXCEPTION 'Le livreur doit d''abord marquer la commande comme livrée';
  END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF v_to_is_hub THEN
    IF v_role NOT IN ('hub', 'directeur', 'admin') THEN
      RAISE EXCEPTION 'Seul le dépôt peut valider cette réception';
    END IF;
    IF v_role = 'hub' AND NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.to_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Dépôt hors périmètre';
    END IF;
  ELSE
    IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
      RAISE EXCEPTION 'Seul le magasin destinataire peut valider la réception';
    END IF;

    IF v_role = 'cashier' THEN
      IF v_store_id IS NULL OR v_store_id <> v_transfer.to_store_id THEN
        RAISE EXCEPTION 'Ce transfert ne concerne pas votre magasin';
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
    'Réception validée depuis ' || COALESCE(v_from_name, 'source')
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

GRANT EXECUTE ON FUNCTION create_store_return_to_hub_transfer(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
