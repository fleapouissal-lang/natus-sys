-- Transferts hub en deux étapes : envoyé → reçu par la caissière

DO $$ BEGIN
  CREATE TYPE hub_stock_transfer_status AS ENUM ('sent', 'received');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hub_stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id UUID NOT NULL REFERENCES stores(id),
  to_store_id UUID NOT NULL REFERENCES stores(id),
  status hub_stock_transfer_status NOT NULL DEFAULT 'sent',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  received_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub_stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES hub_stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (transfer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_stock_transfers_to_store
  ON hub_stock_transfers (to_store_id, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_hub_stock_transfers_from_store
  ON hub_stock_transfers (from_store_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_hub_stock_transfer_items_transfer
  ON hub_stock_transfer_items (transfer_id);

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS hub_transfer_id UUID REFERENCES hub_stock_transfers(id);

-- Envoi hub : déduit l'entrepôt, statut « envoyé », pas encore crédité au magasin
CREATE OR REPLACE FUNCTION transfer_hub_stock(
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
  v_hub_user_id UUID := auth.uid();
  v_city TEXT;
  v_hub_store_id UUID;
  v_transfer_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_current INTEGER;
  v_to_name TEXT;
  v_hub_name TEXT;
  v_note_out TEXT;
BEGIN
  IF NOT is_hub_operator() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT city INTO v_city FROM profiles WHERE id = v_hub_user_id;
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'Ville hub introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM hub_manager_assignments hma
    JOIN profiles p ON p.id = hma.manager_id
    WHERE hma.hub_user_id = v_hub_user_id
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Aucun gérant affecté — transfert impossible';
  END IF;

  SELECT s.id, s.name
  INTO v_hub_store_id, v_hub_name
  FROM stores s
  WHERE s.is_hub = true
    AND s.is_active = true
    AND s.city = v_city
  LIMIT 1;

  IF v_hub_store_id IS NULL THEN
    RAISE EXCEPTION 'Entrepôt hub introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = p_to_store_id
      AND s.is_active = true
      AND NOT s.is_hub
      AND s.city = v_city
  ) THEN
    RAISE EXCEPTION 'Magasin destination invalide';
  END IF;

  SELECT name INTO v_to_name FROM stores WHERE id = p_to_store_id;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Aucun produit à transférer';
  END IF;

  INSERT INTO hub_stock_transfers (from_store_id, to_store_id, status, notes, created_by)
  VALUES (v_hub_store_id, p_to_store_id, 'sent', NULLIF(trim(p_notes), ''), v_hub_user_id)
  RETURNING id INTO v_transfer_id;

  v_note_out := COALESCE(NULLIF(trim(p_notes), ''), 'Envoi hub → ' || v_to_name || ' (en attente réception)');

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Produit invalide';
    END IF;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT si.stock INTO v_current
    FROM store_inventory si
    WHERE si.store_id = v_hub_store_id
      AND si.product_id = v_product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant à l''entrepôt';
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = v_hub_store_id
      AND product_id = v_product_id;

    INSERT INTO hub_stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, v_product_id, v_qty);

    INSERT INTO stock_movements (
      product_id, quantity, type, notes, created_by, store_id, related_store_id, hub_transfer_id
    ) VALUES (
      v_product_id, -v_qty, 'transfer', v_note_out, v_hub_user_id, v_hub_store_id, p_to_store_id, v_transfer_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'store', v_to_name,
    'transfer_id', v_transfer_id,
    'status', 'sent'
  );
END;
$$;

-- Réception caissière : crédite le magasin et passe en « reçu »
CREATE OR REPLACE FUNCTION confirm_hub_stock_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_store_id UUID;
  v_role user_role;
  v_transfer hub_stock_transfers%ROWTYPE;
  v_from_name TEXT;
  v_item RECORD;
  v_note_in TEXT;
BEGIN
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
    INSERT INTO store_inventory (store_id, product_id, stock)
    VALUES (v_transfer.to_store_id, v_item.product_id, v_item.quantity)
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock;

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

  RETURN jsonb_build_object('success', true, 'status', 'received');
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_hub_stock(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_hub_stock_transfer(UUID) TO authenticated;

ALTER TABLE hub_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY hub_stock_transfers_hub_read ON hub_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (
      is_hub_operator()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = from_store_id AND s.city = hub_user_city()
      )
    )
    OR (
      is_management()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = to_store_id AND s.city = management_city()
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'cashier'
          AND p.store_id = hub_stock_transfers.to_store_id
      )
    )
  );

CREATE POLICY hub_stock_transfer_items_read ON hub_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM hub_stock_transfers t
      WHERE t.id = transfer_id
        AND (
          is_director()
          OR (
            is_hub_operator()
            AND EXISTS (
              SELECT 1 FROM stores s
              WHERE s.id = t.from_store_id AND s.city = hub_user_city()
            )
          )
          OR (
            is_management()
            AND EXISTS (
              SELECT 1 FROM stores s
              WHERE s.id = t.to_store_id AND s.city = management_city()
            )
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'cashier'
              AND p.store_id = t.to_store_id
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
