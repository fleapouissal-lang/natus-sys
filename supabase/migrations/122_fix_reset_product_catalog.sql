-- Fix reset_product_catalog : DELETE sans WHERE interdit (safe update)

CREATE OR REPLACE FUNCTION reset_product_catalog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM store_product_writeoff_items WHERE true;
  DELETE FROM hub_stock_transfer_items WHERE true;
  DELETE FROM sale_items WHERE true;
  DELETE FROM stock_movements WHERE true;
  DELETE FROM store_inventory WHERE true;
  DELETE FROM products WHERE true;
END;
$$;

NOTIFY pgrst, 'reload schema';
