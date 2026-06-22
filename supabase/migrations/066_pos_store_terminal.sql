-- Compte caisse partagé par magasin + sessions opérateur (caissier connecté)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_store_pos BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_store_pos_per_store
  ON profiles(store_id)
  WHERE is_store_pos = true AND is_active = true AND store_id IS NOT NULL;

CREATE TABLE cashier_nfc_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  nfc_uid TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cashier_nfc_cards_uid_unique UNIQUE (nfc_uid),
  CONSTRAINT cashier_nfc_cards_cashier_unique UNIQUE (cashier_id)
);

CREATE INDEX idx_cashier_nfc_cards_cashier ON cashier_nfc_cards(cashier_id);
CREATE INDEX idx_cashier_nfc_cards_store ON cashier_nfc_cards(store_id);

CREATE TABLE pos_operator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  terminal_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('password', 'nfc')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_pos_operator_sessions_active_terminal
  ON pos_operator_sessions(terminal_user_id)
  WHERE ended_at IS NULL;

CREATE INDEX idx_pos_operator_sessions_store
  ON pos_operator_sessions(store_id, started_at DESC);

ALTER TABLE cashier_nfc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_operator_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cashier_nfc_cards_select ON cashier_nfc_cards
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
    OR cashier_id = auth.uid()
  );

CREATE POLICY cashier_nfc_cards_write ON cashier_nfc_cards
  FOR ALL TO authenticated
  USING (is_director() OR (is_manager() AND store_in_management_city(store_id)))
  WITH CHECK (is_director() OR (is_manager() AND store_in_management_city(store_id)));

CREATE POLICY pos_operator_sessions_select ON pos_operator_sessions
  FOR SELECT TO authenticated
  USING (
    terminal_user_id = auth.uid()
    OR is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

CREATE POLICY pos_operator_sessions_insert ON pos_operator_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    terminal_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_store_pos = true
        AND p.is_active = true
    )
  );

CREATE POLICY pos_operator_sessions_update ON pos_operator_sessions
  FOR UPDATE TO authenticated
  USING (terminal_user_id = auth.uid())
  WITH CHECK (terminal_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON cashier_nfc_cards TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON pos_operator_sessions TO authenticated, service_role;

CREATE OR REPLACE FUNCTION is_store_pos_terminal()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_store_pos FROM profiles WHERE id = auth.uid() AND is_active = true),
    false
  );
$$;

CREATE OR REPLACE FUNCTION active_pos_operator_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT operator_id
  FROM pos_operator_sessions
  WHERE terminal_user_id = auth.uid()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION resolve_sale_cashier_id(p_operator_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_cashier_id UUID;
BEGIN
  IF NOT is_store_pos_terminal() THEN
    RETURN auth.uid();
  END IF;

  v_cashier_id := COALESCE(p_operator_id, active_pos_operator_id());

  IF v_cashier_id IS NULL THEN
    RAISE EXCEPTION 'Connectez un caissier à la caisse';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles terminal
    JOIN profiles operator ON operator.id = v_cashier_id
    WHERE terminal.id = auth.uid()
      AND terminal.is_store_pos = true
      AND terminal.is_active = true
      AND operator.role = 'cashier'
      AND operator.is_store_pos = false
      AND operator.is_active = true
      AND operator.store_id = terminal.store_id
  ) THEN
    RAISE EXCEPTION 'Caissier invalide pour ce magasin';
  END IF;

  RETURN v_cashier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_store_pos_terminal() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION active_pos_operator_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION resolve_sale_cashier_id(UUID) TO authenticated, service_role;

-- complete_sale : attribution au caissier connecté sur terminal partagé
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

    v_invoice_name := v_customer.full_name;
    v_invoice_phone := v_customer.phone;
    v_invoice_email := v_customer.email;

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

  IF p_promo_code IS NOT NULL AND trim(p_promo_code) <> '' THEN
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

-- fulfill_shopify_order_sale : même attribution opérateur
CREATE OR REPLACE FUNCTION fulfill_shopify_order_sale(
  p_shopify_order_id UUID,
  p_items JSONB,
  p_store_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_operator_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_store_id UUID;
  v_store_stock INTEGER;
  v_order shopify_orders%ROWTYPE;
  v_invoice_name TEXT := 'Divers';
  v_cashier_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  v_cashier_id := resolve_sale_cashier_id(p_operator_id);

  IF p_payment_method NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  SELECT * INTO v_order
  FROM shopify_orders
  WHERE id = p_shopify_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.fulfilled_at IS NOT NULL OR v_order.sale_id IS NOT NULL THEN
    RAISE EXCEPTION 'Commande déjà préparée en caisse';
  END IF;

  IF p_store_id IS NOT NULL AND (is_director() OR is_manager()) THEN
    IF NOT can_access_store(p_store_id) THEN
      RAISE EXCEPTION 'Accès magasin refusé';
    END IF;
    v_store_id := p_store_id;
  ELSE
    v_store_id := COALESCE(v_order.store_id, (SELECT store_id FROM profiles WHERE id = auth.uid()));

    IF v_store_id IS NULL THEN
      SELECT id INTO v_store_id FROM stores WHERE is_active = true ORDER BY created_at LIMIT 1;
    END IF;
  END IF;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Aucun magasin configuré';
  END IF;

  v_invoice_name := COALESCE(NULLIF(trim(v_order.customer_name), ''), 'Divers');

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

    v_total := v_total + v_product.price * v_qty;
  END LOOP;

  INSERT INTO sales (
    cashier_id,
    total,
    payment_method,
    store_id,
    customer_name,
    customer_phone,
    customer_email,
    shopify_order_id
  )
  VALUES (
    v_cashier_id,
    v_total,
    p_payment_method,
    v_store_id,
    v_invoice_name,
    v_order.customer_phone,
    v_order.customer_email,
    p_shopify_order_id
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
    VALUES (
      v_product.id,
      -v_qty,
      'sale',
      'Préparation commande Shopify ' || v_order.order_number,
      v_cashier_id,
      v_store_id
    );
  END LOOP;

  UPDATE shopify_orders
  SET sale_id = v_sale_id
  WHERE id = p_shopify_order_id;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Annulation : terminal partagé = caissier connecté
CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id UUID)
RETURNS UUID AS $$
DECLARE
  v_sale sales%ROWTYPE;
  v_item sale_items%ROWTYPE;
  v_role user_role;
  v_store_id UUID;
  v_effective_cashier UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vente introuvable';
  END IF;

  IF v_sale.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cette vente est déjà annulée';
  END IF;

  IF v_role = 'cashier' THEN
    IF is_store_pos_terminal() THEN
      v_effective_cashier := active_pos_operator_id();
      IF v_effective_cashier IS NULL OR v_sale.cashier_id <> v_effective_cashier THEN
        RAISE EXCEPTION 'Vous ne pouvez annuler que vos propres ventes';
      END IF;
    ELSIF v_sale.cashier_id <> auth.uid() THEN
      RAISE EXCEPTION 'Vous ne pouvez annuler que vos propres ventes';
    END IF;
    IF v_sale.created_at < now() - interval '24 hours' THEN
      RAISE EXCEPTION 'Annulation impossible après 24 h — contactez le gérant';
    END IF;
  ELSIF v_role IN ('manager', 'directeur', 'admin') THEN
    IF v_role = 'manager' AND v_sale.store_id IS NOT NULL THEN
      IF NOT can_access_store(v_sale.store_id) THEN
        RAISE EXCEPTION 'Accès magasin refusé';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  FOR v_item IN
    SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE store_inventory
    SET stock = stock + v_item.quantity
    WHERE store_id = v_sale.store_id AND product_id = v_item.product_id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'adjustment',
      'Annulation vente ' || p_sale_id,
      COALESCE(active_pos_operator_id(), auth.uid()),
      v_sale.store_id
    );
  END LOOP;

  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      loyalty_points = GREATEST(
        0,
        loyalty_points + v_sale.loyalty_points_redeemed - v_sale.loyalty_points_earned
      ),
      updated_at = now()
    WHERE id = v_sale.customer_id;

    IF v_sale.loyalty_points_redeemed > 0 THEN
      INSERT INTO loyalty_transactions (customer_id, sale_id, type, points, description, created_by)
      VALUES (
        v_sale.customer_id,
        p_sale_id,
        'earn',
        v_sale.loyalty_points_redeemed,
        'Annulation vente — points remboursés',
        COALESCE(active_pos_operator_id(), auth.uid())
      );
    END IF;

    IF v_sale.loyalty_points_earned > 0 THEN
      INSERT INTO loyalty_transactions (customer_id, sale_id, type, points, description, created_by)
      VALUES (
        v_sale.customer_id,
        p_sale_id,
        'redeem',
        v_sale.loyalty_points_earned,
        'Annulation vente — points retirés',
        COALESCE(active_pos_operator_id(), auth.uid())
      );
    END IF;
  END IF;

  IF v_sale.promo_code IS NOT NULL THEN
    UPDATE winback_promo_codes
    SET used_at = NULL, sale_id = NULL
    WHERE sale_id = p_sale_id;
  END IF;

  UPDATE sales
  SET
    cancelled_at = now(),
    cancelled_by = COALESCE(active_pos_operator_id(), auth.uid())
  WHERE id = p_sale_id;

  RETURN p_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

NOTIFY pgrst, 'reload schema';
