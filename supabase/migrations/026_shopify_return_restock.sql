-- Réception retour en magasin + remise en stock

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS return_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_received_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION restore_shopify_return_stock(
  p_items JSONB,
  p_store_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_store_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  IF p_store_id IS NOT NULL AND (is_director() OR is_manager()) THEN
    IF NOT can_access_store(p_store_id) THEN
      RAISE EXCEPTION 'Accès magasin refusé';
    END IF;
    v_store_id := p_store_id;
  ELSE
    SELECT store_id INTO v_store_id FROM profiles WHERE id = auth.uid();

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Magasin non assigné';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO store_inventory (store_id, product_id, stock)
    VALUES (v_store_id, v_product.id, v_qty)
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET stock = store_inventory.stock + EXCLUDED.stock;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (
      v_product.id,
      v_qty,
      'adjustment',
      'Retour commande Shopify — remise en stock',
      auth.uid(),
      v_store_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION restore_shopify_return_stock(JSONB, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
