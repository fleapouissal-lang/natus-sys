-- Compte caisse magasin partagé : ventes et annulations au nom du terminal (auth.uid())

CREATE OR REPLACE FUNCTION resolve_sale_cashier_id(p_operator_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF is_store_pos_terminal() THEN
    RETURN auth.uid();
  END IF;

  RETURN auth.uid();
END;
$$;

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
