-- Modifier les produits d'une commande envoyée (statut en_cours / pret) tant qu'elle
-- n'a pas été remise au livreur. Réajuste automatiquement le stock source par delta :
-- - produit ajouté ou quantité augmentée -> déduction supplémentaire (contrôle de stock)
-- - produit retiré ou quantité réduite -> recrédit au magasin source.

CREATE OR REPLACE FUNCTION edit_store_stock_transfer_items(
  p_transfer_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_transfer store_stock_transfers%ROWTYPE;
  v_deducted BOOLEAN;
  v_to_name TEXT;
  v_note TEXT;
  v_current INTEGER;
  v_updated INTEGER;
  r RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status NOT IN ('en_cours', 'pret') THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être modifiée';
  END IF;

  IF v_transfer.picked_up_at IS NOT NULL OR v_transfer.shipped_at IS NOT NULL THEN
    RAISE EXCEPTION 'Commande déjà remise au livreur : modification impossible';
  END IF;

  IF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  v_deducted := v_transfer.source_stock_deducted_at IS NOT NULL;

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Modification transfert magasin → ' || COALESCE(v_to_name, 'destination')
  );

  IF v_deducted THEN
    FOR r IN
      SELECT
        COALESCE(o.product_id, n.product_id) AS product_id,
        COALESCE(o.quantity, 0) AS old_qty,
        COALESCE(n.quantity, 0) AS new_qty
      FROM (
        SELECT product_id, quantity
        FROM store_stock_transfer_items
        WHERE transfer_id = p_transfer_id
      ) o
      FULL OUTER JOIN (
        SELECT (value->>'product_id')::UUID AS product_id,
               SUM((value->>'quantity')::INTEGER) AS quantity
        FROM jsonb_array_elements(p_items)
        WHERE NULLIF(value->>'product_id', '') IS NOT NULL
          AND (value->>'quantity')::INTEGER > 0
        GROUP BY 1
      ) n ON n.product_id = o.product_id
    LOOP
      -- delta > 0 : on prélève davantage à la source ; delta < 0 : on recrédite.
      IF (r.new_qty - r.old_qty) = 0 THEN
        CONTINUE;
      END IF;

      IF (r.new_qty - r.old_qty) > 0 THEN
        SELECT si.stock INTO v_current
        FROM store_inventory si
        WHERE si.store_id = v_transfer.from_store_id
          AND si.product_id = r.product_id
        FOR UPDATE;

        IF COALESCE(v_current, 0) < (r.new_qty - r.old_qty) THEN
          RAISE EXCEPTION 'Stock insuffisant au magasin source';
        END IF;
      END IF;

      UPDATE store_inventory
      SET stock = stock - (r.new_qty - r.old_qty)
      WHERE store_id = v_transfer.from_store_id
        AND product_id = r.product_id;

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        INSERT INTO store_inventory (store_id, product_id, stock)
        VALUES (v_transfer.from_store_id, r.product_id, -(r.new_qty - r.old_qty));
      END IF;

      INSERT INTO stock_movements (
        product_id, quantity, type, notes, created_by, store_id, related_store_id, store_transfer_id
      ) VALUES (
        r.product_id,
        -(r.new_qty - r.old_qty),
        'transfer',
        v_note,
        v_user_id,
        v_transfer.from_store_id,
        v_transfer.to_store_id,
        p_transfer_id
      );
    END LOOP;
  END IF;

  DELETE FROM store_stock_transfer_items WHERE transfer_id = p_transfer_id;

  INSERT INTO store_stock_transfer_items (transfer_id, product_id, quantity)
  SELECT p_transfer_id,
         (value->>'product_id')::UUID,
         SUM((value->>'quantity')::INTEGER)
  FROM jsonb_array_elements(p_items)
  WHERE NULLIF(value->>'product_id', '') IS NOT NULL
    AND (value->>'quantity')::INTEGER > 0
  GROUP BY (value->>'product_id')::UUID;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', v_transfer.status);
END;
$$;

CREATE OR REPLACE FUNCTION edit_hub_stock_transfer_items(
  p_transfer_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_deducted BOOLEAN;
  v_to_name TEXT;
  v_note TEXT;
  v_current INTEGER;
  v_updated INTEGER;
  r RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_transfer FROM hub_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status NOT IN ('en_cours', 'pret') THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être modifiée';
  END IF;

  IF v_transfer.picked_up_at IS NOT NULL THEN
    RAISE EXCEPTION 'Commande déjà remise au livreur : modification impossible';
  END IF;

  IF is_hub_operator() AND NOT is_director_or_admin() THEN
    SELECT city INTO v_city FROM profiles WHERE id = v_user_id;
    IF NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  v_deducted := v_transfer.source_stock_deducted_at IS NOT NULL;

  SELECT name INTO v_to_name FROM stores WHERE id = v_transfer.to_store_id;
  v_note := COALESCE(
    NULLIF(trim(v_transfer.notes), ''),
    'Modification transfert dépôt → ' || COALESCE(v_to_name, 'destination')
  );

  IF v_deducted THEN
    FOR r IN
      SELECT
        COALESCE(o.product_id, n.product_id) AS product_id,
        COALESCE(o.quantity, 0) AS old_qty,
        COALESCE(n.quantity, 0) AS new_qty
      FROM (
        SELECT product_id, quantity
        FROM hub_stock_transfer_items
        WHERE transfer_id = p_transfer_id
      ) o
      FULL OUTER JOIN (
        SELECT (value->>'product_id')::UUID AS product_id,
               SUM((value->>'quantity')::INTEGER) AS quantity
        FROM jsonb_array_elements(p_items)
        WHERE NULLIF(value->>'product_id', '') IS NOT NULL
          AND (value->>'quantity')::INTEGER > 0
        GROUP BY 1
      ) n ON n.product_id = o.product_id
    LOOP
      IF (r.new_qty - r.old_qty) = 0 THEN
        CONTINUE;
      END IF;

      IF (r.new_qty - r.old_qty) > 0 THEN
        SELECT si.stock INTO v_current
        FROM store_inventory si
        WHERE si.store_id = v_transfer.from_store_id
          AND si.product_id = r.product_id
        FOR UPDATE;

        IF COALESCE(v_current, 0) < (r.new_qty - r.old_qty) THEN
          RAISE EXCEPTION 'Stock insuffisant à la source';
        END IF;
      END IF;

      UPDATE store_inventory
      SET stock = stock - (r.new_qty - r.old_qty)
      WHERE store_id = v_transfer.from_store_id
        AND product_id = r.product_id;

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        INSERT INTO store_inventory (store_id, product_id, stock)
        VALUES (v_transfer.from_store_id, r.product_id, -(r.new_qty - r.old_qty));
      END IF;

      INSERT INTO stock_movements (
        product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
      ) VALUES (
        r.product_id,
        -(r.new_qty - r.old_qty),
        'transfer',
        v_note,
        v_user_id,
        v_transfer.from_store_id,
        v_transfer.to_store_id,
        p_transfer_id
      );
    END LOOP;
  END IF;

  DELETE FROM hub_stock_transfer_items WHERE transfer_id = p_transfer_id;

  INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
  SELECT p_transfer_id,
         (value->>'product_id')::UUID,
         SUM((value->>'quantity')::INTEGER)
  FROM jsonb_array_elements(p_items)
  WHERE NULLIF(value->>'product_id', '') IS NOT NULL
    AND (value->>'quantity')::INTEGER > 0
  GROUP BY (value->>'product_id')::UUID;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', v_transfer.status);
END;
$$;

GRANT EXECUTE ON FUNCTION edit_store_stock_transfer_items(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_hub_stock_transfer_items(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
