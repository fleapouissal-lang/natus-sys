-- Clôture du jour calendaire : les ventes continuent le même jour jusqu'au lendemain

CREATE OR REPLACE FUNCTION sync_store_current_business_date(p_store_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current DATE;
  v_calendar DATE;
  v_next DATE;
BEGIN
  SELECT current_business_date INTO v_current
  FROM stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN store_calendar_date();
  END IF;

  v_calendar := store_calendar_date();
  v_next := COALESCE(v_current, v_calendar);

  IF v_next > v_calendar + 1 THEN
    v_next := LEAST(v_next, v_calendar + 1);
  END IF;

  IF v_next < v_calendar AND EXISTS (
    SELECT 1
    FROM store_day_closures
    WHERE store_id = p_store_id
      AND status = 'validated'
      AND business_date = v_next
  ) THEN
    v_next := v_calendar;
  END IF;

  UPDATE stores
  SET current_business_date = v_next
  WHERE id = p_store_id
    AND current_business_date IS DISTINCT FROM v_next;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_store_current_business_date(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION validate_store_day_closure(p_validation_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_closure store_day_closures%ROWTYPE;
  v_store stores%ROWTYPE;
  v_next_date DATE;
  v_calendar DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_code := regexp_replace(trim(COALESCE(p_validation_code, '')), '\D', '', 'g');
  IF length(v_code) <> 6 THEN
    RAISE EXCEPTION 'Code invalide (6 chiffres requis)';
  END IF;

  SELECT * INTO v_closure
  FROM store_day_closures
  WHERE validation_code = v_code AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code introuvable ou déjà validé';
  END IF;

  IF NOT is_director() AND NOT (is_manager() AND can_access_store(v_closure.store_id)) THEN
    RAISE EXCEPTION 'Seul le gérant ou le directeur peut valider une clôture';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = v_closure.store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_calendar := store_calendar_date();

  IF v_closure.business_date >= v_calendar THEN
    -- Clôture du jour en cours : la caisse reste ouverte le même jour métier
    v_next_date := v_closure.business_date;
  ELSE
    v_next_date := LEAST(v_closure.business_date + 1, v_calendar);
    IF v_next_date < v_calendar THEN
      v_next_date := v_calendar;
    END IF;
  END IF;

  UPDATE store_day_closures
  SET
    status = 'validated',
    validated_by = auth.uid(),
    validated_at = now()
  WHERE id = v_closure.id;

  UPDATE stores
  SET current_business_date = v_next_date
  WHERE id = v_store.id;

  RETURN jsonb_build_object(
    'status', 'validated',
    'store_id', v_store.id,
    'store_name', v_store.name,
    'closed_business_date', v_closure.business_date,
    'next_business_date', v_next_date,
    'stats', v_closure.stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_store_pos_day_state(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_pending store_day_closures%ROWTYPE;
  v_show_code BOOLEAN;
  v_business_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_access_store(p_store_id) AND NOT is_director() THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  v_business_date := sync_store_current_business_date(p_store_id);

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_show_code := is_director() OR is_manager();

  SELECT * INTO v_pending
  FROM store_day_closures
  WHERE store_id = p_store_id AND status = 'pending'
  ORDER BY requested_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_business_date,
    'pending', CASE
      WHEN v_pending.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_pending.id,
        'validation_code', CASE WHEN v_show_code THEN v_pending.validation_code ELSE NULL END,
        'business_date', v_pending.business_date,
        'stats', v_pending.stats,
        'requested_at', v_pending.requested_at,
        'cashier_code_confirmed', v_pending.cashier_code_confirmed_at IS NOT NULL
      )
    END
  );
END;
$$;

-- complete_sale : synchroniser le jour métier avant chaque vente (clôture en attente OK)
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
  v_business_date DATE;
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

  v_business_date := sync_store_current_business_date(v_store_id);
  IF v_business_date IS NULL THEN
    v_business_date := store_calendar_date();
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

    IF v_is_active_pro_client AND p_points_to_redeem > 0 THEN
      RAISE EXCEPTION 'Les clients Pro ne peuvent pas utiliser de points fidélité';
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

  IF p_customer_id IS NOT NULL AND NOT v_is_active_pro_client THEN
    v_points_earn := FLOOR(v_total / v_points_per_mad)::INTEGER;
  END IF;

  INSERT INTO sales (
    cashier_id,
    total,
    payment_method,
    store_id,
    business_date,
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
    v_business_date,
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

-- Réaligner les magasins dont le jour métier a dépassé le calendrier après clôtures rapides
UPDATE stores
SET current_business_date = LEAST(current_business_date, store_calendar_date())
WHERE current_business_date > store_calendar_date();

NOTIFY pgrst, 'reload schema';
