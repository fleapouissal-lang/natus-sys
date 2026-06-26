-- Livreur : marquer livré au magasin · Caissier seul : valider réception + stock

CREATE OR REPLACE FUNCTION deliver_hub_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = v_user_id AND is_active = true;

  IF v_role <> 'livreur' THEN
    RAISE EXCEPTION 'Seul le livreur assigné peut marquer la commande comme livrée';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'en_livraison' THEN
    RAISE EXCEPTION 'Seule une commande en livraison peut être marquée livrée';
  END IF;

  IF v_transfer.assigned_livreur_id IS NULL OR v_transfer.assigned_livreur_id <> v_user_id THEN
    RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
  END IF;

  UPDATE hub_stock_transfers
  SET
    status = 'livre',
    delivered_at = NOW(),
    delivered_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'livre');
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

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Seul le magasin destinataire peut valider la réception';
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
    'Réception validée depuis ' || COALESCE(v_from_name, 'entrepôt hub')
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

GRANT EXECUTE ON FUNCTION deliver_hub_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_hub_stock_transfer(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
