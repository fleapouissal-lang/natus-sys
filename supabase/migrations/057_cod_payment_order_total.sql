-- Encaissement COD : montant = total commande Shopify, magasin = magasin commande.

CREATE OR REPLACE FUNCTION record_cod_payment(
  p_items JSONB,
  p_store_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT 'Divers',
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_shopify_order_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_order_total DECIMAL(10,2);
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_store_id UUID;
  v_invoice_name TEXT := COALESCE(NULLIF(trim(p_customer_name), ''), 'Divers');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  IF p_shopify_order_id IS NOT NULL THEN
    SELECT store_id, total
    INTO v_store_id, v_order_total
    FROM shopify_orders
    WHERE id = p_shopify_order_id;
  END IF;

  IF v_store_id IS NULL AND p_store_id IS NOT NULL AND (is_director() OR is_manager()) THEN
    IF NOT can_access_store(p_store_id) THEN
      RAISE EXCEPTION 'Accès magasin refusé';
    END IF;
    v_store_id := p_store_id;
  ELSIF v_store_id IS NULL THEN
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
    v_total := v_total + v_product.price * v_qty;
  END LOOP;

  IF v_order_total IS NOT NULL AND v_order_total > 0 THEN
    v_total := v_order_total;
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
    'cash',
    v_store_id,
    v_invoice_name,
    p_customer_phone,
    p_customer_email,
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

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION assign_cod_sale_to_cashier(p_sale_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order_total DECIMAL(10,2);
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

  SELECT o.total INTO v_order_total
  FROM sales s
  JOIN shopify_orders o ON o.id = s.shopify_order_id
  WHERE s.id = p_sale_id;

  UPDATE sales
  SET
    cashier_id = auth.uid(),
    created_at = NOW(),
    payment_method = 'cash',
    total = COALESCE(NULLIF(v_order_total, 0), total)
  WHERE id = p_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

NOTIFY pgrst, 'reload schema';
