-- Purge anciens livreurs + périmètre hub (magasins rattachés, y compris hors ville)

CREATE OR REPLACE FUNCTION hub_depot_store_for_retail(p_store_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s_hub.id
  FROM hub_store_assignments hsa
  JOIN profiles hp ON hp.id = hsa.hub_user_id AND hp.role = 'hub' AND hp.is_active = true
  JOIN stores s_hub ON s_hub.is_hub = true AND s_hub.is_active = true AND s_hub.city = hp.city
  WHERE hsa.store_id = p_store_id
  ORDER BY hsa.created_at NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION hub_depot_city_for_retail(p_store_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hp.city
  FROM hub_store_assignments hsa
  JOIN profiles hp ON hp.id = hsa.hub_user_id AND hp.role = 'hub' AND hp.is_active = true
  WHERE hsa.store_id = p_store_id
  ORDER BY hsa.created_at NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION hub_depot_city_for_transfer(p_from_store_id UUID, p_to_store_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.city FROM stores s WHERE s.id = p_from_store_id AND s.is_hub = true),
    (SELECT s.city FROM stores s WHERE s.id = p_to_store_id AND s.is_hub = true)
  );
$$;

-- Supprimer les anciens comptes livreur (magasin) — à recréer en « Livreur (ville) »
UPDATE shopify_orders
SET assigned_livreur_id = NULL
WHERE assigned_livreur_id IN (SELECT id FROM profiles WHERE role = 'livreur');

UPDATE hub_stock_transfers
SET assigned_livreur_id = NULL
WHERE assigned_livreur_id IN (SELECT id FROM profiles WHERE role = 'livreur');

DELETE FROM auth.users
WHERE id IN (SELECT id FROM profiles WHERE role = 'livreur');

-- Commandes : le livreur voit tout ce qui lui est assigné (y compris magasin autre ville rattaché au hub)
DROP POLICY IF EXISTS "Livreur read assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur read assigned shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
  );

DROP POLICY IF EXISTS "Livreur update assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur update assigned shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
  )
  WITH CHECK (
    is_livreur()
    AND assigned_livreur_id = auth.uid()
  );

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
  v_hub_city TEXT;
  v_depot_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_is_hub BOOLEAN;
  v_to_is_hub BOOLEAN;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_hub_city FROM profiles WHERE id = v_hub_user_id;

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

  SELECT COALESCE(s.is_hub, false) INTO v_from_is_hub FROM stores s WHERE s.id = v_transfer.from_store_id;
  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub FROM stores s WHERE s.id = v_transfer.to_store_id;

  v_depot_city := hub_depot_city_for_transfer(v_transfer.from_store_id, v_transfer.to_store_id);

  IF v_depot_city IS NULL OR v_depot_city <> v_hub_city THEN
    RAISE EXCEPTION 'Transfert hors périmètre dépôt';
  END IF;

  IF v_from_is_hub THEN
    IF NOT EXISTS (
      SELECT 1
      FROM hub_store_assignments hsa
      JOIN stores s ON s.id = hsa.store_id
      WHERE hsa.hub_user_id = v_hub_user_id
        AND hsa.store_id = v_transfer.to_store_id
        AND s.is_active = true
        AND NOT COALESCE(s.is_hub, false)
    ) THEN
      RAISE EXCEPTION 'Magasin destination non rattaché à ce dépôt';
    END IF;
  ELSIF v_to_is_hub THEN
    IF NOT EXISTS (
      SELECT 1
      FROM hub_store_assignments hsa
      WHERE hsa.hub_user_id = v_hub_user_id
        AND hsa.store_id = v_transfer.from_store_id
    ) THEN
      RAISE EXCEPTION 'Magasin source non rattaché à ce dépôt';
    END IF;
  ELSE
    RAISE EXCEPTION 'Transfert invalide';
  END IF;

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
  v_hub_city TEXT;
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

  v_hub_store_id := hub_depot_store_for_retail(v_order.store_id);
  v_hub_city := hub_depot_city_for_retail(v_order.store_id);

  IF v_hub_store_id IS NULL OR v_hub_city IS NULL THEN
    RAISE EXCEPTION 'Aucun dépôt rattaché à ce magasin';
  END IF;

  v_livreur_id := v_order.assigned_livreur_id;

  IF v_livreur_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_livreur_id AND p.role = 'livreur' AND p.is_active = true AND p.city = v_hub_city
  ) THEN
    SELECT id INTO v_livreur_id
    FROM profiles
    WHERE role = 'livreur'
      AND is_active = true
      AND city = v_hub_city
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

GRANT EXECUTE ON FUNCTION hub_depot_store_for_retail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION hub_depot_city_for_retail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION hub_depot_city_for_transfer(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
