-- COD : préparation = sortie stock seulement ; encaissement = vente caisse du jour.

CREATE OR REPLACE FUNCTION fulfill_shopify_order_sale(
  p_shopify_order_id UUID,
  p_items JSONB,
  p_store_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash'
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = v_store_id AND product_id = v_product.id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (
      v_product.id,
      -v_qty,
      'sale',
      'Préparation commande Shopify ' || v_order.order_number,
      auth.uid(),
      v_store_id
    );
  END LOOP;

  -- COD : pas de vente à la préparation — encaissement après livraison.
  IF v_order.payment_type = 'cod' THEN
    RETURN NULL;
  END IF;

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
    auth.uid(),
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
  END LOOP;

  UPDATE shopify_orders
  SET sale_id = v_sale_id
  WHERE id = p_shopify_order_id;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION assign_cod_sale_to_cashier(p_sale_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = p_sale_id
      AND s.shopify_order_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Vente commande introuvable';
  END IF;

  UPDATE sales
  SET
    cashier_id = auth.uid(),
    created_at = NOW(),
    payment_method = 'cash'
  WHERE id = p_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION assign_cod_sale_to_cashier(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
