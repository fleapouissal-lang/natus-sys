-- image produit + mode de paiement + vente améliorée

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'card'));

CREATE OR REPLACE FUNCTION complete_sale(
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', v_product.name;
    END IF;
    v_total := v_total + v_product.price * v_qty;
  END LOOP;

  INSERT INTO sales (cashier_id, total, payment_method)
  VALUES (auth.uid(), v_total, p_payment_method)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty WHERE id = v_product.id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by)
    VALUES (v_product.id, -v_qty, 'sale', 'Vente ' || v_sale_id, auth.uid());
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
