-- Commande de réapprovisionnement initiée par le CAISSIER.
-- Le caissier commande des produits (souvent en rupture dans son magasin) depuis
-- un dépôt (hub) ou un autre magasin actif. La commande crée immédiatement un
-- transfert :
--   • visible « stock envoyé » côté source (dépôt ou magasin sélectionné) ;
--   • visible « stock reçu » côté magasin du caissier (à confirmer à réception).
-- Le stock source est déduit dès la création (cohérent avec les autres
-- transferts), et le magasin destination est crédité à la réception validée.

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
  v_current INTEGER;
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
    -- Dépôt → magasin : système hub_stock_transfers
    v_kind := 'hub';

    INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
    VALUES (
      p_source_id,
      v_dest_store_id,
      'en_cours',
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

      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = p_source_id AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant à la source';
      END IF;

      INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (v_transfer_id, v_product_id, v_qty);
    END LOOP;

    PERFORM deduct_hub_transfer_source_stock(v_transfer_id, v_user_id, NULL);
  ELSE
    -- Magasin → magasin : système store_stock_transfers
    v_kind := 'store';

    IF NOT is_active_retail_store(p_source_id) THEN
      RAISE EXCEPTION 'Magasin source invalide';
    END IF;

    INSERT INTO store_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
    VALUES (
      p_source_id,
      v_dest_store_id,
      'en_cours',
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

      SELECT si.stock INTO v_current
      FROM store_inventory si
      WHERE si.store_id = p_source_id AND si.product_id = v_product_id;

      IF COALESCE(v_current, 0) < v_qty THEN
        RAISE EXCEPTION 'Stock insuffisant au magasin source';
      END IF;

      INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
      VALUES (v_transfer_id, v_product_id, v_qty);
    END LOOP;

    PERFORM deduct_store_transfer_source_stock(v_transfer_id, v_user_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'kind', v_kind,
    'source', v_source_name,
    'to_store', v_dest_name,
    'status', 'en_cours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_cashier_restock_order(UUID, JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
