-- Retours stock magasin : produits périmés ou cassés (caissier → validation gérant/directeur)

CREATE TYPE store_writeoff_reason AS ENUM ('expired', 'broken');
CREATE TYPE store_writeoff_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE store_product_writeoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  reason store_writeoff_reason NOT NULL,
  status store_writeoff_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  rejection_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store_product_writeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writeoff_id UUID NOT NULL REFERENCES store_product_writeoffs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (writeoff_id, product_id)
);

CREATE INDEX idx_store_writeoffs_store_status
  ON store_product_writeoffs (store_id, status, created_at DESC);

CREATE INDEX idx_store_writeoffs_pending
  ON store_product_writeoffs (status, created_at DESC)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION create_store_product_writeoff(
  p_reason store_writeoff_reason,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_store_id UUID;
  v_writeoff_id UUID;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_stock INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT store_id INTO v_store_id
  FROM profiles
  WHERE id = auth.uid()
    AND is_active = true
    AND role = 'cashier';

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Magasin non assigné à ce compte caissier';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Ajoutez au moins un produit';
  END IF;

  INSERT INTO store_product_writeoffs (store_id, created_by, reason, notes)
  VALUES (v_store_id, auth.uid(), p_reason, NULLIF(trim(p_notes), ''))
  RETURNING id INTO v_writeoff_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable';
    END IF;

    IF v_product.product_kind = 'parent' THEN
      RAISE EXCEPTION 'Sélectionnez une variante ou un produit vendable, pas un parent catalogue';
    END IF;

    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide pour %', v_product.name;
    END IF;

    SELECT stock INTO v_stock
    FROM store_inventory
    WHERE store_id = v_store_id AND product_id = v_product.id;

    IF COALESCE(v_stock, 0) < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (dispo: %)', v_product.name, COALESCE(v_stock, 0);
    END IF;

    INSERT INTO store_product_writeoff_items (writeoff_id, product_id, quantity)
    VALUES (v_writeoff_id, v_product.id, v_qty);
  END LOOP;

  RETURN v_writeoff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION validate_store_product_writeoff(
  p_writeoff_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_writeoff store_product_writeoffs%ROWTYPE;
  v_item store_product_writeoff_items%ROWTYPE;
  v_product products%ROWTYPE;
  v_stock INTEGER;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role NOT IN ('directeur', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Seul un gérant ou directeur peut valider ce retour';
  END IF;

  SELECT * INTO v_writeoff
  FROM store_product_writeoffs
  WHERE id = p_writeoff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retour introuvable';
  END IF;

  IF v_writeoff.status <> 'pending' THEN
    RAISE EXCEPTION 'Ce retour a déjà été traité';
  END IF;

  IF NOT (
    can_access_store(v_writeoff.store_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  FOR v_item IN
    SELECT * FROM store_product_writeoff_items WHERE writeoff_id = p_writeoff_id
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item.product_id;

    SELECT stock INTO v_stock
    FROM store_inventory
    WHERE store_id = v_writeoff.store_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND OR v_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (dispo: %)', v_product.name, COALESCE(v_stock, 0);
    END IF;

    UPDATE store_inventory
    SET stock = stock - v_item.quantity,
        updated_at = NOW()
    WHERE store_id = v_writeoff.store_id AND product_id = v_item.product_id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (
      v_item.product_id,
      -v_item.quantity,
      'adjustment',
      'Retour ' || v_writeoff.reason::TEXT || ' — validation retour ' || p_writeoff_id,
      auth.uid(),
      v_writeoff.store_id
    );
  END LOOP;

  UPDATE store_product_writeoffs
  SET
    status = 'approved',
    validated_by = auth.uid(),
    validated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_writeoff_id;

  RETURN p_writeoff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION reject_store_product_writeoff(
  p_writeoff_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_writeoff store_product_writeoffs%ROWTYPE;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role NOT IN ('directeur', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Seul un gérant ou directeur peut refuser ce retour';
  END IF;

  SELECT * INTO v_writeoff
  FROM store_product_writeoffs
  WHERE id = p_writeoff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retour introuvable';
  END IF;

  IF v_writeoff.status <> 'pending' THEN
    RAISE EXCEPTION 'Ce retour a déjà été traité';
  END IF;

  IF NOT (
    can_access_store(v_writeoff.store_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  UPDATE store_product_writeoffs
  SET
    status = 'rejected',
    validated_by = auth.uid(),
    validated_at = NOW(),
    rejection_note = NULLIF(trim(p_note), ''),
    updated_at = NOW()
  WHERE id = p_writeoff_id;

  RETURN p_writeoff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

ALTER TABLE store_product_writeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_writeoff_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writeoffs read scoped" ON store_product_writeoffs
  FOR SELECT TO authenticated
  USING (can_access_store(store_id));

CREATE POLICY "Writeoff items read scoped" ON store_product_writeoff_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_product_writeoffs w
      WHERE w.id = writeoff_id AND can_access_store(w.store_id)
    )
  );

GRANT EXECUTE ON FUNCTION create_store_product_writeoff(store_writeoff_reason, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_store_product_writeoff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_store_product_writeoff(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
