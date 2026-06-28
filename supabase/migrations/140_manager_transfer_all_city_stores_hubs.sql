-- Gérant : transfert depuis n'importe quel magasin retail de la ville
-- vers tout magasin retail ou tout dépôt hub de la même ville.

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
      OR (is_manager() AND store_in_management_city(p_from_store_id))
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'cashier'
          AND p.store_id = p_from_store_id
      )
    );
$$;

DROP FUNCTION IF EXISTS create_store_to_hub_stock_transfer(UUID, JSONB, TEXT);

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
  v_depot_city TEXT;
  v_from_city TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(p_from_store_id) THEN
    RAISE EXCEPTION 'Non autorisé pour ce magasin source';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_from_store_id
      AND s.is_active = true
      AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin source invalide';
  END IF;

  SELECT city INTO v_from_city FROM stores WHERE id = p_from_store_id;

  IF p_to_hub_store_id IS NOT NULL THEN
    SELECT s.id, s.name, s.city
    INTO v_hub_store_id, v_hub_name, v_depot_city
    FROM stores s
    WHERE s.id = p_to_hub_store_id
      AND s.is_active = true
      AND COALESCE(s.is_hub, false) = true;

    IF v_hub_store_id IS NULL THEN
      RAISE EXCEPTION 'Dépôt destination invalide';
    END IF;

    IF is_manager() AND NOT is_director_or_admin() THEN
      IF v_depot_city IS DISTINCT FROM management_city() THEN
        RAISE EXCEPTION 'Dépôt hors périmètre ville';
      END IF;
    END IF;
  ELSE
    v_hub_store_id := hub_depot_store_for_retail(p_from_store_id);
    v_depot_city := hub_depot_city_for_retail(p_from_store_id);

    IF v_hub_store_id IS NULL OR v_depot_city IS NULL THEN
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

  SELECT s.city INTO v_depot_city
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF v_depot_city IS NULL THEN
    RAISE EXCEPTION 'Ville du dépôt introuvable';
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

GRANT EXECUTE ON FUNCTION create_store_to_hub_stock_transfer(UUID, JSONB, TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
