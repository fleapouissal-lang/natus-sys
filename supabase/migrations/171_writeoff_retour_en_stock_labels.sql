-- Renommer les libellés « annulation de stock » → « retour en stock » (messages RPC)

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
  v_is_hub BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  SELECT * INTO v_writeoff
  FROM store_product_writeoffs
  WHERE id = p_writeoff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retour en stock introuvable';
  END IF;

  SELECT COALESCE(is_hub, false) INTO v_is_hub
  FROM stores
  WHERE id = v_writeoff.store_id;

  IF COALESCE(v_is_hub, false) THEN
    IF v_role NOT IN ('directeur', 'admin') THEN
      RAISE EXCEPTION 'Seul un directeur peut valider un retour en stock en dépôt (Hub)';
    END IF;
  ELSIF v_role NOT IN ('directeur', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Seuls le gérant ou le directeur peuvent valider un retour en stock en magasin';
  END IF;

  IF v_writeoff.status <> 'pending' THEN
    RAISE EXCEPTION 'Ce retour en stock a déjà été traité';
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
      'Retour en stock ' || v_item.reason::TEXT || ' — validation ' || p_writeoff_id,
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
  v_is_hub BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  SELECT * INTO v_writeoff
  FROM store_product_writeoffs
  WHERE id = p_writeoff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retour en stock introuvable';
  END IF;

  SELECT COALESCE(is_hub, false) INTO v_is_hub
  FROM stores
  WHERE id = v_writeoff.store_id;

  IF COALESCE(v_is_hub, false) THEN
    IF v_role NOT IN ('directeur', 'admin') THEN
      RAISE EXCEPTION 'Seul un directeur peut refuser un retour en stock en dépôt (Hub)';
    END IF;
  ELSIF v_role NOT IN ('directeur', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Seuls le gérant ou le directeur peuvent refuser un retour en stock en magasin';
  END IF;

  IF v_writeoff.status <> 'pending' THEN
    RAISE EXCEPTION 'Ce retour en stock a déjà été traité';
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

NOTIFY pgrst, 'reload schema';
