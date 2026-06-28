-- Transferts : crédit destination à la livraison (statut livré), pas à la validation réception.

ALTER TABLE store_stock_transfers
  ADD COLUMN IF NOT EXISTS destination_stock_credited_at TIMESTAMPTZ;

ALTER TABLE hub_stock_transfers
  ADD COLUMN IF NOT EXISTS destination_stock_credited_at TIMESTAMPTZ;

UPDATE store_stock_transfers
SET destination_stock_credited_at = COALESCE(received_at, delivered_at)
WHERE destination_stock_credited_at IS NULL
  AND status IN ('livre', 'received');

UPDATE hub_stock_transfers
SET destination_stock_credited_at = COALESCE(received_at, delivered_at)
WHERE destination_stock_credited_at IS NULL
  AND status IN ('livre', 'received', 'sent');

CREATE OR REPLACE FUNCTION credit_store_transfer_destination_stock(
  p_transfer_id UUID,
  p_user_id UUID,
  p_note_override TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
  v_updated INTEGER;
BEGIN
  SELECT * INTO v_transfer
  FROM store_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.destination_stock_credited_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = v_transfer.from_store_id;
  v_note_in := COALESCE(
    p_note_override,
    NULLIF(trim(v_transfer.notes), ''),
    'Réception livrée depuis ' || COALESCE(v_from_name, 'magasin source')
  );

  FOR v_item IN
    SELECT product_id, quantity
    FROM store_stock_transfer_items
    WHERE transfer_id = p_transfer_id
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
      v_item.product_id,
      v_item.quantity,
      'transfer',
      v_note_in,
      p_user_id,
      v_transfer.to_store_id,
      v_transfer.from_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE store_stock_transfers
  SET destination_stock_credited_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION credit_hub_transfer_destination_stock(
  p_transfer_id UUID,
  p_user_id UUID,
  p_note_override TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
  v_updated INTEGER;
BEGIN
  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.destination_stock_credited_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT name INTO v_from_name FROM stores WHERE id = v_transfer.from_store_id;
  v_note_in := COALESCE(
    p_note_override,
    NULLIF(trim(v_transfer.notes), ''),
    'Réception livrée depuis ' || COALESCE(v_from_name, 'source')
  );

  FOR v_item IN
    SELECT product_id, quantity
    FROM hub_stock_transfer_items
    WHERE transfer_id = p_transfer_id
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
      product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
    ) VALUES (
      v_item.product_id,
      v_item.quantity,
      'transfer',
      v_note_in,
      p_user_id,
      v_transfer.to_store_id,
      v_transfer.from_store_id,
      p_transfer_id
    );
  END LOOP;

  UPDATE hub_stock_transfers
  SET destination_stock_credited_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION deliver_store_stock_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id AND is_active = true;

  IF v_role <> 'livreur' THEN
    RAISE EXCEPTION 'Seul le livreur assigné peut marquer la commande comme livrée';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'en_livraison' THEN
    RAISE EXCEPTION 'Seule une commande en livraison peut être marquée livrée';
  END IF;

  IF v_transfer.assigned_livreur_id IS NULL OR v_transfer.assigned_livreur_id <> v_user_id THEN
    RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
  END IF;

  PERFORM credit_store_transfer_destination_stock(p_transfer_id, v_user_id, NULL);

  UPDATE store_stock_transfers
  SET status = 'livre', delivered_at = NOW(), delivered_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'livre');
END;
$$;

CREATE OR REPLACE FUNCTION mark_store_transfer_delivered(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN deliver_store_stock_transfer(p_transfer_id);
END;
$$;

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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

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

  PERFORM credit_hub_transfer_destination_stock(p_transfer_id, v_user_id, NULL);

  UPDATE hub_stock_transfers
  SET
    status = 'livre',
    delivered_at = NOW(),
    delivered_by = v_user_id
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles WHERE id = v_user_id AND is_active = true;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé pour confirmer la réception';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;

  IF v_transfer.status = 'received' THEN
    RAISE EXCEPTION 'Ce transfert a déjà été reçu';
  END IF;

  IF v_transfer.status <> 'livre' THEN
    RAISE EXCEPTION 'Le livreur doit d''abord marquer la commande comme livrée';
  END IF;

  IF v_role = 'cashier' THEN
    IF v_store_id IS NULL OR v_store_id <> v_transfer.to_store_id THEN
      RAISE EXCEPTION 'Ce transfert ne concerne pas votre magasin';
    END IF;
  ELSIF v_role = 'manager' AND NOT is_director_or_admin() THEN
    IF NOT can_access_store(v_transfer.to_store_id) THEN
      RAISE EXCEPTION 'Magasin destination hors périmètre';
    END IF;
  END IF;

  IF v_transfer.destination_stock_credited_at IS NULL THEN
    PERFORM credit_store_transfer_destination_stock(p_transfer_id, v_user_id, NULL);
  END IF;

  UPDATE store_stock_transfers
  SET status = 'received', received_by = v_user_id, received_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'received');
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
  v_item_count INTEGER;
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

  IF v_transfer.status = 'received' THEN
    RAISE EXCEPTION 'Ce transfert a déjà été reçu';
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

  IF v_transfer.destination_stock_credited_at IS NULL THEN
    PERFORM credit_hub_transfer_destination_stock(p_transfer_id, v_user_id, NULL);
  END IF;

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

GRANT EXECUTE ON FUNCTION credit_store_transfer_destination_stock(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION credit_hub_transfer_destination_stock(UUID, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
