-- Sécurité RLS marketing/bot, winback lié à la carte, annulation vente POS

-- ─── Winback : carte fidélité obligatoire ───
CREATE OR REPLACE FUNCTION validate_pos_promo_code(
  p_code TEXT,
  p_store_id UUID,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  normalized_code TEXT,
  promo_label TEXT,
  discount_percent NUMERIC,
  is_winback BOOLEAN
) AS $$
DECLARE
  v_code TEXT := upper(trim(COALESCE(p_code, '')));
  v_winback winback_promo_codes%ROWTYPE;
  v_store stores%ROWTYPE;
BEGIN
  IF v_code = '' THEN
    RAISE EXCEPTION 'Code promo vide';
  END IF;

  SELECT * INTO v_winback
  FROM winback_promo_codes w
  WHERE upper(w.code) = v_code
  FOR UPDATE;

  IF FOUND THEN
    IF v_winback.store_id <> p_store_id THEN
      RAISE EXCEPTION 'Code promo invalide pour ce magasin';
    END IF;
    IF v_winback.used_at IS NOT NULL THEN
      RAISE EXCEPTION 'Ce code promo a déjà été utilisé';
    END IF;
    IF v_winback.expires_at <= now() THEN
      RAISE EXCEPTION 'Ce code promo a expiré';
    END IF;
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION 'Scannez la carte fidélité du client pour utiliser ce code promo';
    END IF;
    IF v_winback.customer_id <> p_customer_id THEN
      RAISE EXCEPTION 'Ce code promo est réservé à un autre client';
    END IF;

    SELECT * INTO v_store FROM stores WHERE id = p_store_id;

    RETURN QUERY
    SELECT
      v_winback.code,
      COALESCE(v_store.promo_label, '-10%'),
      parse_promo_label_percent(v_store.promo_label),
      true;
    RETURN;
  END IF;

  SELECT * INTO v_store
  FROM stores
  WHERE id = p_store_id
    AND upper(COALESCE(promo_code, '')) = v_code;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_store.promo_code,
      COALESCE(v_store.promo_label, '-10%'),
      parse_promo_label_percent(v_store.promo_label),
      false;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Code promo invalide ou expiré';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── Annulation vente magasin ───
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id UUID)
RETURNS UUID AS $$
DECLARE
  v_sale sales%ROWTYPE;
  v_item sale_items%ROWTYPE;
  v_role user_role;
  v_store_id UUID;
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
    IF v_sale.cashier_id <> auth.uid() THEN
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
      auth.uid(),
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
        auth.uid()
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
        auth.uid()
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
    cancelled_by = auth.uid()
  WHERE id = p_sale_id;

  RETURN p_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION cancel_sale(UUID) TO authenticated;

-- ─── RLS tables marketing / bot ───
ALTER TABLE winback_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_whatsapp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY winback_promo_director_read ON winback_promo_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('directeur', 'admin')
        AND p.is_active = true
    )
  );

CREATE POLICY winback_promo_manager_read ON winback_promo_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.id = winback_promo_codes.store_id
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.is_active = true
        AND p.city = s.city
    )
  );

CREATE POLICY whatsapp_reviews_management_read ON customer_whatsapp_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('directeur', 'admin', 'manager')
        AND p.is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
