-- Transferts magasin → magasin : assignation livreur (workflow hub)

ALTER TABLE store_stock_transfers
  ADD COLUMN IF NOT EXISTS assigned_livreur_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_store_stock_transfers_livreur
  ON store_stock_transfers (assigned_livreur_id, status, sent_at DESC);

CREATE OR REPLACE FUNCTION can_manage_store_transfer_source(p_from_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_director_or_admin()
    OR (is_manager() AND can_access_store(p_from_store_id))
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role = 'cashier'
        AND p.store_id = p_from_store_id
    );
$$;

CREATE OR REPLACE FUNCTION mark_store_transfer_ready(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'en_cours' THEN
    RAISE EXCEPTION 'Seule une commande en cours peut être marquée prête';
  END IF;

  IF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  UPDATE store_stock_transfers
  SET status = 'pret', ready_at = NOW()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'pret');
END;
$$;

CREATE OR REPLACE FUNCTION assign_store_transfer_livreur(
  p_transfer_id UUID,
  p_livreur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer store_stock_transfers%ROWTYPE;
  v_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Livreur requis';
  END IF;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être assignée à un livreur';
  END IF;

  IF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  SELECT city INTO v_city FROM stores WHERE id = v_transfer.from_store_id;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_livreur_id
      AND p.role = 'livreur'
      AND p.is_active = true
      AND p.city = v_city
  ) THEN
    RAISE EXCEPTION 'Livreur invalide pour cette ville';
  END IF;

  UPDATE store_stock_transfers
  SET assigned_livreur_id = p_livreur_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'assigned_livreur_id', p_livreur_id);
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
  v_role user_role;
  v_transfer store_stock_transfers%ROWTYPE;
  v_item RECORD;
  v_current INTEGER;
  v_to_name TEXT;
  v_note_out TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id AND is_active = true;

  SELECT * INTO v_transfer FROM store_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;
  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être remise au livreur';
  END IF;

  IF v_transfer.assigned_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Aucun livreur assigné à cette commande';
  END IF;

  IF v_role = 'livreur' THEN
    IF v_transfer.assigned_livreur_id <> v_user_id THEN
      RAISE EXCEPTION 'Cette commande ne vous est pas assignée';
    END IF;
  ELSIF NOT can_manage_store_transfer_source(v_transfer.from_store_id) THEN
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
  SET
    status = 'en_livraison',
    shipped_at = NOW(),
    shipped_by = v_user_id,
    picked_up_at = NOW(),
    picked_up_by = v_user_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', 'en_livraison');
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

GRANT EXECUTE ON FUNCTION can_manage_store_transfer_source(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_store_transfer_livreur(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deliver_store_stock_transfer(UUID) TO authenticated;
