-- Transferts stock magasin → magasin (commandes avec statuts)

DO $$ BEGIN
  CREATE TYPE store_stock_transfer_status AS ENUM (
    'en_cours',
    'pret',
    'en_livraison',
    'livre',
    'received'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS store_stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id UUID NOT NULL REFERENCES stores(id),
  to_store_id UUID NOT NULL REFERENCES stores(id),
  status store_stock_transfer_status NOT NULL DEFAULT 'en_cours',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  ready_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  shipped_by UUID REFERENCES profiles(id),
  delivered_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES profiles(id),
  received_by UUID REFERENCES profiles(id),
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_store_id <> to_store_id)
);

CREATE TABLE IF NOT EXISTS store_stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES store_stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (transfer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_stock_transfers_from
  ON store_stock_transfers (from_store_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_stock_transfers_to
  ON store_stock_transfers (to_store_id, status, sent_at DESC);

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS store_transfer_id UUID REFERENCES store_stock_transfers(id);

-- Remplace l'ancien transfert immédiat par une commande en_cours
DROP FUNCTION IF EXISTS transfer_store_stock(UUID, UUID, JSONB, TEXT);

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

  IF NOT is_director_or_admin() THEN
    IF NOT can_access_store(p_from_store_id) OR NOT can_access_store(p_to_store_id) THEN
      RAISE EXCEPTION 'Magasin hors périmètre';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_from_store_id AND s.is_active = true AND NOT COALESCE(s.is_hub, false)
  ) OR NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_to_store_id AND s.is_active = true AND NOT COALESCE(s.is_hub, false)
  ) THEN
    RAISE EXCEPTION 'Magasin retail invalide';
  END IF;

  IF is_manager() AND NOT is_director_or_admin() THEN
    IF (SELECT city FROM stores WHERE id = p_from_store_id)
      <> (SELECT city FROM stores WHERE id = p_to_store_id) THEN
      RAISE EXCEPTION 'Transfert inter-ville non autorisé';
    END IF;
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

  IF NOT is_director_or_admin() AND NOT can_access_store(v_transfer.from_store_id) THEN
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

  IF NOT is_director_or_admin() AND NOT can_access_store(v_transfer.from_store_id) THEN
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

  IF NOT is_director_or_admin() AND NOT can_access_store(v_transfer.to_store_id) THEN
    RAISE EXCEPTION 'Magasin destination hors périmètre';
  END IF;

  UPDATE store_stock_transfers
  SET status = 'livre', delivered_at = NOW(), delivered_by = auth.uid()
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
    IF NOT can_access_store(v_transfer.to_store_id) THEN
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

GRANT EXECUTE ON FUNCTION create_store_stock_transfer(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_store_transfer_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ship_store_stock_transfer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_store_transfer_delivered(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_store_stock_transfer(UUID) TO authenticated;

ALTER TABLE store_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_stock_transfers_read ON store_stock_transfers;
CREATE POLICY store_stock_transfers_read ON store_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director_or_admin()
    OR (is_manager() AND (
      store_in_management_city(from_store_id) OR store_in_management_city(to_store_id)
    ))
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
          OR (is_manager() AND (
            store_in_management_city(t.from_store_id) OR store_in_management_city(t.to_store_id)
          ))
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.is_active = true
              AND p.store_id IN (t.from_store_id, t.to_store_id)
          )
        )
    )
  );

GRANT SELECT ON store_stock_transfers TO authenticated;
GRANT SELECT ON store_stock_transfer_items TO authenticated;

NOTIFY pgrst, 'reload schema';
