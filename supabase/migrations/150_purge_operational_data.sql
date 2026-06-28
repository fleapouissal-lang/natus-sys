-- Purge des données opérationnelles : conserve products, profiles (utilisateurs) et stores (structure).
-- Supprime ventes, commandes, transferts, stocks, plannings, notifications métier, etc.

CREATE OR REPLACE FUNCTION purge_operational_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory_rows INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Seul un directeur ou admin peut purger les données opérationnelles';
  END IF;

  -- Enfants / tables liées
  DELETE FROM news_announcement_images WHERE true;
  DELETE FROM news_announcements WHERE true;
  DELETE FROM store_product_writeoff_photos WHERE true;
  DELETE FROM store_product_writeoff_items WHERE true;
  DELETE FROM store_product_writeoffs WHERE true;
  DELETE FROM hub_stock_transfer_items WHERE true;
  DELETE FROM store_stock_transfer_items WHERE true;
  DELETE FROM sale_items WHERE true;
  DELETE FROM sale_cheques WHERE true;
  DELETE FROM loyalty_transactions WHERE true;
  DELETE FROM customer_notes WHERE true;
  DELETE FROM customer_whatsapp_reviews WHERE true;
  DELETE FROM stock_modify_access_request_stores WHERE true;
  DELETE FROM fabrication_inventory WHERE true;
  DELETE FROM winback_promo_codes WHERE true;
  DELETE FROM shopify_orders WHERE true;
  DELETE FROM hub_stock_transfers WHERE true;
  DELETE FROM store_stock_transfers WHERE true;
  DELETE FROM sales WHERE true;
  DELETE FROM stock_movements WHERE true;
  DELETE FROM store_day_closures WHERE true;
  DELETE FROM store_pos_notes WHERE true;
  DELETE FROM store_complaints WHERE true;
  DELETE FROM store_planning_cashiers WHERE true;
  DELETE FROM cashier_store_transfers WHERE true;
  DELETE FROM cashier_week_offs WHERE true;
  DELETE FROM cashier_shifts WHERE true;
  DELETE FROM cashier_nfc_cards WHERE true;
  DELETE FROM pos_operator_sessions WHERE true;
  DELETE FROM customers WHERE true;
  DELETE FROM pro_client_registration_sessions WHERE true;
  DELETE FROM pro_client_invites WHERE true;
  DELETE FROM whatsapp_bot_sessions WHERE true;
  DELETE FROM short_links WHERE true;
  DELETE FROM hub_store_assignments WHERE true;
  DELETE FROM hub_manager_assignments WHERE true;
  DELETE FROM stock_modify_access_requests WHERE true;
  DELETE FROM fabrication_products WHERE true;
  DELETE FROM pos_category_cards WHERE true;
  DELETE FROM loyalty_settings WHERE true;
  DELETE FROM pos_closure_settings WHERE true;

  DELETE FROM store_inventory WHERE true;

  INSERT INTO store_inventory (store_id, product_id, stock)
  SELECT s.id, p.id, 0
  FROM stores s
  CROSS JOIN products p
  WHERE s.is_active = true
  ON CONFLICT (store_id, product_id) DO UPDATE
  SET stock = 0, updated_at = NOW();

  GET DIAGNOSTICS v_inventory_rows = ROW_COUNT;

  UPDATE products SET stock = 0, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'store_inventory_rows', v_inventory_rows,
    'kept', jsonb_build_array('products', 'profiles', 'stores', 'auth.users')
  );
END;
$$;

REVOKE ALL ON FUNCTION purge_operational_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_operational_data() TO service_role;

NOTIFY pgrst, 'reload schema';
