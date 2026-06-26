-- Client Pro : remise automatique 34 % en caisse

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS pro_client_discount NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION complete_sale(
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cash',
  p_store_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_points_to_redeem INTEGER DEFAULT 0,
  p_promo_code TEXT DEFAULT NULL,
  p_operator_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_subtotal DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2) := 0;
  v_loyalty_discount DECIMAL(10,2) := 0;
  v_pro_client_discount DECIMAL(10,2) := 0;
  v_promo_discount DECIMAL(10,2) := 0;
  v_after_loyalty DECIMAL(10,2) := 0;
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
  v_promo_row RECORD;
  v_promo_code TEXT := NULL;
  v_is_winback BOOLEAN := false;
  v_invoice_name TEXT := 'Divers';
  v_invoice_phone TEXT := NULL;
  v_invoice_email TEXT := NULL;
  v_cashier_id UUID;
  v_is_active_pro_client BOOLEAN := false;
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

  v_cashier_id := resolve_sale_cashier_id(p_operator_id);

  SELECT ls.points_per_mad, ls.point_value_mad, ls.min_points_to_redeem
  INTO v_points_per_mad, v_point_value_mad, v_min_redeem_points
  FROM loyalty_settings ls
  WHERE ls.id = 1;

  IF p_payment_method NOT IN ('cash', 'card', 'cheque') THEN
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

    v_invoice_name := v_customer.full_name;
    v_invoice_phone := v_customer.phone;
    v_invoice_email := v_customer.email;
    v_is_active_pro_client := v_customer.is_pro_client AND v_customer.pro_client_active;

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
      v_loyalty_discount := v_points_redeem * v_point_value_mad;
    END IF;
  ELSIF p_points_to_redeem > 0 THEN
    RAISE EXCEPTION 'Client requis pour utiliser des points';
  END IF;

  v_after_loyalty := v_subtotal - v_loyalty_discount;
  IF v_after_loyalty < 0 THEN
    v_after_loyalty := 0;
  END IF;

  IF v_is_active_pro_client THEN
    v_pro_client_discount := ROUND(v_after_loyalty * 34 / 100, 2);
    v_after_loyalty := v_after_loyalty - v_pro_client_discount;
    IF v_after_loyalty < 0 THEN
      v_after_loyalty := 0;
    END IF;
  END IF;

  IF p_promo_code IS NOT NULL AND trim(p_promo_code) <> '' AND NOT v_is_active_pro_client THEN
    SELECT * INTO v_promo_row
    FROM validate_pos_promo_code(trim(p_promo_code), v_store_id, p_customer_id);

    v_promo_code := v_promo_row.normalized_code;
    v_is_winback := v_promo_row.is_winback;
    v_promo_discount := ROUND(
      v_after_loyalty * v_promo_row.discount_percent / 100,
      2
    );
  END IF;

  v_total := v_after_loyalty - v_promo_discount;
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
    loyalty_points_earned,
    promo_code,
    promo_discount,
    pro_client_discount,
    customer_name,
    customer_phone,
    customer_email
  )
  VALUES (
    v_cashier_id,
    v_total,
    p_payment_method,
    v_store_id,
    p_customer_id,
    v_loyalty_discount,
    v_points_redeem,
    v_points_earn,
    v_promo_code,
    v_promo_discount,
    v_pro_client_discount,
    v_invoice_name,
    v_invoice_phone,
    v_invoice_email
  )
  RETURNING id INTO v_sale_id;

  IF v_is_winback AND v_promo_code IS NOT NULL THEN
    UPDATE winback_promo_codes
    SET used_at = now(), sale_id = v_sale_id
    WHERE upper(code) = upper(v_promo_code)
      AND used_at IS NULL;
  END IF;

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
    VALUES (v_product.id, -v_qty, 'sale', 'Vente ' || v_sale_id, v_cashier_id, v_store_id);
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
        'Utilisation en caisse — réduction ' || v_loyalty_discount || ' MAD',
        v_cashier_id
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
        v_cashier_id
      );
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

NOTIFY pgrst, 'reload schema';
