-- Paramètres fidélité configurables par le directeur

CREATE TABLE IF NOT EXISTS loyalty_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  points_per_mad NUMERIC(10, 2) NOT NULL DEFAULT 10 CHECK (points_per_mad > 0),
  point_value_mad NUMERIC(10, 4) NOT NULL DEFAULT 1 CHECK (point_value_mad > 0),
  min_points_to_redeem INTEGER NOT NULL DEFAULT 200 CHECK (min_points_to_redeem >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO loyalty_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_settings_select_authenticated
  ON loyalty_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION get_public_loyalty_settings()
RETURNS TABLE (
  points_per_mad NUMERIC,
  point_value_mad NUMERIC,
  min_points_to_redeem INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.points_per_mad,
    ls.point_value_mad,
    ls.min_points_to_redeem
  FROM loyalty_settings ls
  WHERE ls.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_loyalty_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION update_loyalty_settings(
  p_points_per_mad NUMERIC,
  p_point_value_mad NUMERIC,
  p_min_points_to_redeem INTEGER
)
RETURNS loyalty_settings AS $$
DECLARE
  v_row loyalty_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    is_director()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Seul le directeur peut modifier les paramètres fidélité';
  END IF;

  IF p_points_per_mad IS NULL OR p_points_per_mad <= 0 THEN
    RAISE EXCEPTION 'Montant MAD par point invalide';
  END IF;

  IF p_point_value_mad IS NULL OR p_point_value_mad <= 0 THEN
    RAISE EXCEPTION 'Valeur du point invalide';
  END IF;

  IF p_min_points_to_redeem IS NULL OR p_min_points_to_redeem < 0 THEN
    RAISE EXCEPTION 'Minimum de points invalide';
  END IF;

  UPDATE loyalty_settings
  SET
    points_per_mad = p_points_per_mad,
    point_value_mad = p_point_value_mad,
    min_points_to_redeem = p_min_points_to_redeem,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = 1
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION update_loyalty_settings(NUMERIC, NUMERIC, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION complete_sale(
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cash',
  p_store_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_points_to_redeem INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_subtotal DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2) := 0;
  v_discount DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_store_id UUID;
  v_store_stock INTEGER;
  v_customer customers%ROWTYPE;
  v_points_redeem INTEGER := 0;
  v_points_earn INTEGER := 0;
  v_max_redeem INTEGER;
  v_points_per_mad NUMERIC := 10;
  v_point_value_mad NUMERIC := 1;
  v_min_redeem_points INTEGER := 200;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('cashier', 'manager', 'directeur', 'admin')
  ) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT ls.points_per_mad, ls.point_value_mad, ls.min_points_to_redeem
  INTO v_points_per_mad, v_point_value_mad, v_min_redeem_points
  FROM loyalty_settings ls
  WHERE ls.id = 1;

  IF p_payment_method NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  IF p_points_to_redeem < 0 THEN
    RAISE EXCEPTION 'Points invalides';
  END IF;

  IF p_store_id IS NOT NULL AND (is_director() OR is_manager()) THEN
    IF NOT can_access_store(p_store_id) THEN
      RAISE EXCEPTION 'Accès magasin refusé';
    END IF;
    v_store_id := p_store_id;
  ELSE
    SELECT store_id INTO v_store_id FROM profiles WHERE id = auth.uid();

    IF v_store_id IS NULL THEN
      SELECT id INTO v_store_id FROM stores WHERE is_active = true ORDER BY created_at LIMIT 1;
    END IF;
  END IF;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Aucun magasin configuré';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT stock INTO v_store_stock
    FROM store_inventory
    WHERE store_id = v_store_id AND product_id = v_product.id
    FOR UPDATE;

    IF NOT FOUND OR v_store_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour % dans ce magasin', v_product.name;
    END IF;

    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Client fidélité introuvable';
    END IF;

    IF p_points_to_redeem > 0 AND v_customer.loyalty_points < v_min_redeem_points THEN
      RAISE EXCEPTION 'Minimum % points requis pour utiliser la fidélité en caisse', v_min_redeem_points;
    END IF;

    IF p_points_to_redeem > 0 THEN
      v_max_redeem := LEAST(
        p_points_to_redeem,
        v_customer.loyalty_points,
        FLOOR(v_subtotal / v_point_value_mad)::INTEGER
      );
      v_points_redeem := GREATEST(v_max_redeem, 0);
      v_discount := v_points_redeem * v_point_value_mad;
    END IF;
  ELSIF p_points_to_redeem > 0 THEN
    RAISE EXCEPTION 'Client requis pour utiliser des points';
  END IF;

  v_total := v_subtotal - v_discount;
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    v_points_earn := FLOOR(v_total / v_points_per_mad)::INTEGER;
  END IF;

  INSERT INTO sales (
    cashier_id,
    total,
    payment_method,
    store_id,
    customer_id,
    loyalty_discount,
    loyalty_points_redeemed,
    loyalty_points_earned
  )
  VALUES (
    auth.uid(),
    v_total,
    p_payment_method,
    v_store_id,
    p_customer_id,
    v_discount,
    v_points_redeem,
    v_points_earn
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price);

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = v_store_id AND product_id = v_product.id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (v_product.id, -v_qty, 'sale', 'Vente ' || v_sale_id, auth.uid(), v_store_id);
  END LOOP;

  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      loyalty_points = loyalty_points - v_points_redeem + v_points_earn,
      updated_at = NOW()
    WHERE id = p_customer_id;

    IF v_points_redeem > 0 THEN
      INSERT INTO loyalty_transactions (customer_id, sale_id, type, points, description, created_by)
      VALUES (
        p_customer_id,
        v_sale_id,
        'redeem',
        v_points_redeem,
        'Utilisation en caisse — réduction ' || v_discount || ' MAD',
        auth.uid()
      );
    END IF;

    IF v_points_earn > 0 THEN
      INSERT INTO loyalty_transactions (customer_id, sale_id, type, points, description, created_by)
      VALUES (
        p_customer_id,
        v_sale_id,
        'earn',
        v_points_earn,
        'Gain fidélité — vente ' || v_sale_id,
        auth.uid()
      );
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

NOTIFY pgrst, 'reload schema';
