-- Purge toutes les commandes / transferts de stock (hub + magasin).
-- Conserve : ventes, commandes Shopify, clients, produits, stock actuel.

CREATE OR REPLACE FUNCTION purge_stock_transfer_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hub_items INTEGER := 0;
  v_store_items INTEGER := 0;
  v_transfer_movements INTEGER := 0;
  v_hub_transfers INTEGER := 0;
  v_store_transfers INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Seul un directeur ou admin peut purger les commandes de stock';
  END IF;

  DELETE FROM hub_stock_transfer_items WHERE true;
  GET DIAGNOSTICS v_hub_items = ROW_COUNT;

  DELETE FROM store_stock_transfer_items WHERE true;
  GET DIAGNOSTICS v_store_items = ROW_COUNT;

  DELETE FROM stock_movements
  WHERE type = 'transfer'
     OR hub_transfer_id IS NOT NULL
     OR store_transfer_id IS NOT NULL;
  GET DIAGNOSTICS v_transfer_movements = ROW_COUNT;

  DELETE FROM hub_stock_transfers WHERE true;
  GET DIAGNOSTICS v_hub_transfers = ROW_COUNT;

  DELETE FROM store_stock_transfers WHERE true;
  GET DIAGNOSTICS v_store_transfers = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'hub_stock_transfer_items', v_hub_items,
      'store_stock_transfer_items', v_store_items,
      'stock_movements_transfer', v_transfer_movements,
      'hub_stock_transfers', v_hub_transfers,
      'store_stock_transfers', v_store_transfers
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION purge_stock_transfer_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_stock_transfer_orders() TO service_role;

NOTIFY pgrst, 'reload schema';
