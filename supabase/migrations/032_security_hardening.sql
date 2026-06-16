-- Renforcement sécurité : carte publique, RLS caissier, rôles signup & ventes

-- ---------------------------------------------------------------------------
-- Carte fidélité publique : projection minimale (sans téléphone / email)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_public_loyalty_card(p_token UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  card_number TEXT,
  loyalty_points INTEGER,
  card_variant TEXT,
  qr_token UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF p_token IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.card_number,
    c.loyalty_points,
    COALESCE(c.card_variant, 'champagne'),
    c.qr_token,
    c.created_at
  FROM customers c
  WHERE c.qr_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION get_public_loyalty_transactions(
  p_token UUID,
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  sale_id UUID,
  type TEXT,
  points INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_customer_id UUID;
  v_limit INTEGER;
BEGIN
  IF p_token IS NULL THEN
    RETURN;
  END IF;

  SELECT c.id INTO v_customer_id FROM customers c WHERE c.qr_token = p_token;
  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 30);

  RETURN QUERY
  SELECT
    lt.id,
    lt.customer_id,
    lt.sale_id,
    lt.type,
    lt.points,
    lt.description,
    lt.created_at
  FROM loyalty_transactions lt
  WHERE lt.customer_id = v_customer_id
  ORDER BY lt.created_at DESC
  LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_loyalty_card(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_loyalty_transactions(UUID, INTEGER) TO anon, authenticated;

-- L'ancienne RPC exposait toute la ligne customers (téléphone, email…) à anon
REVOKE EXECUTE ON FUNCTION get_loyalty_customer_by_qr_token(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_loyalty_customer_by_qr_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_loyalty_customer_by_qr_token(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Inscription : interdire l'élévation de privilège via metadata client
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'cashier';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('manager', 'cashier', 'livreur') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, city)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    NULLIF(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    city = COALESCE(EXCLUDED.city, profiles.city);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS caissier : limité au magasin assigné
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Cashier read customers" ON customers;
CREATE POLICY "Cashier read customers" ON customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND (
          customers.store_id IS NULL
          OR p.store_id IS NULL
          OR customers.store_id = p.store_id
        )
    )
  );

DROP POLICY IF EXISTS "Cashier read loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Cashier read loyalty transactions" ON loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN customers c ON c.id = loyalty_transactions.customer_id
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND (
          c.store_id IS NULL
          OR p.store_id IS NULL
          OR c.store_id = p.store_id
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Vente caisse : rôles autorisés uniquement (logique inchangée depuis 029)
-- ---------------------------------------------------------------------------
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

    IF p_points_to_redeem > 0 THEN
      v_max_redeem := LEAST(
        p_points_to_redeem,
        v_customer.loyalty_points,
        FLOOR(v_subtotal)::INTEGER
      );
      v_points_redeem := GREATEST(v_max_redeem, 0);
      v_discount := v_points_redeem;
    END IF;
  ELSIF p_points_to_redeem > 0 THEN
    RAISE EXCEPTION 'Client requis pour utiliser des points';
  END IF;

  v_total := v_subtotal - v_discount;
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    v_points_earn := FLOOR(v_total / 10)::INTEGER;
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
