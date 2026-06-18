-- Corrige la réception hub : crédit stock magasin + réparation des transferts déjà « reçus »

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

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Seul le magasin destinataire peut confirmer la réception';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'sent' THEN
    RAISE EXCEPTION 'Ce transfert a déjà été traité';
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

-- Répare un transfert déjà marqué « reçu » sans crédit stock (idempotent)
CREATE OR REPLACE FUNCTION repair_hub_transfer_stock(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_item RECORD;
  v_from_name TEXT;
  v_note_in TEXT;
  v_item_count INTEGER := 0;
  v_credited INTEGER := 0;
  v_updated INTEGER;
BEGIN
  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'received' THEN
    RAISE EXCEPTION 'Seuls les transferts déjà reçus peuvent être réparés';
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
    v_item_count := v_item_count + 1;

    IF EXISTS (
      SELECT 1
      FROM stock_movements sm
      WHERE sm.hub_transfer_id = p_transfer_id
        AND sm.store_id = v_transfer.to_store_id
        AND sm.product_id = v_item.product_id
        AND sm.quantity > 0
    ) THEN
      CONTINUE;
    END IF;

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
      v_note_in || ' (réparation)',
      COALESCE(v_transfer.received_by, v_transfer.created_by),
      v_transfer.to_store_id,
      v_transfer.from_store_id,
      p_transfer_id
    );

    v_credited := v_credited + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'items_total', v_item_count,
    'items_credited', v_credited
  );
END;
$$;

ALTER FUNCTION transfer_hub_stock(UUID, JSONB, TEXT) SET row_security = off;

GRANT EXECUTE ON FUNCTION confirm_hub_stock_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION repair_hub_transfer_stock(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
