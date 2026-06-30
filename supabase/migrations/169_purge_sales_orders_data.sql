-- Purge commandes Shopify + ventes caisse uniquement.
-- Conserve : utilisateurs, clients, produits, catégories POS, magasins, stock actuel.

CREATE OR REPLACE FUNCTION purge_sales_and_orders_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_cheques INTEGER := 0;
  v_sale_items INTEGER := 0;
  v_loyalty_tx INTEGER := 0;
  v_shopify_orders INTEGER := 0;
  v_sales INTEGER := 0;
  v_stock_movements INTEGER := 0;
  v_closures INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Seul un directeur ou admin peut purger les ventes et commandes';
  END IF;

  DELETE FROM sale_cheques WHERE true;
  GET DIAGNOSTICS v_sale_cheques = ROW_COUNT;

  DELETE FROM sale_items WHERE true;
  GET DIAGNOSTICS v_sale_items = ROW_COUNT;

  DELETE FROM loyalty_transactions WHERE true;
  GET DIAGNOSTICS v_loyalty_tx = ROW_COUNT;

  UPDATE customers
  SET loyalty_points = 0,
      whatsapp_winback_sent_at = NULL
  WHERE true;

  UPDATE winback_promo_codes
  SET used_at = NULL,
      sale_id = NULL
  WHERE true;

  DELETE FROM customer_notes WHERE shopify_order_id IS NOT NULL;

  IF to_regclass('public.customer_whatsapp_reviews') IS NOT NULL THEN
    DELETE FROM customer_whatsapp_reviews WHERE shopify_order_id IS NOT NULL;
  END IF;

  DELETE FROM shopify_orders WHERE true;
  GET DIAGNOSTICS v_shopify_orders = ROW_COUNT;

  DELETE FROM sales WHERE true;
  GET DIAGNOSTICS v_sales = ROW_COUNT;

  DELETE FROM stock_movements WHERE type = 'sale';
  GET DIAGNOSTICS v_stock_movements = ROW_COUNT;

  DELETE FROM store_day_closures WHERE true;
  GET DIAGNOSTICS v_closures = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'sale_cheques', v_sale_cheques,
      'sale_items', v_sale_items,
      'loyalty_transactions', v_loyalty_tx,
      'shopify_orders', v_shopify_orders,
      'sales', v_sales,
      'stock_movements_sale', v_stock_movements,
      'store_day_closures', v_closures
    ),
    'kept', jsonb_build_array(
      'profiles',
      'customers',
      'products',
      'pos_category_cards',
      'stores',
      'store_inventory'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION purge_sales_and_orders_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_sales_and_orders_data() TO service_role;

NOTIFY pgrst, 'reload schema';
