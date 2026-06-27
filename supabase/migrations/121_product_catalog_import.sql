-- Catalogue POS : code produit (COM), prix barré, classification + reset import

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10,2)
    CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN IF NOT EXISTS classification TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_unique_idx
  ON products (product_code)
  WHERE product_code IS NOT NULL;

COMMENT ON COLUMN products.product_code IS 'Code interne COM (distinct du code-barres)';
COMMENT ON COLUMN products.compare_at_price IS 'Prix barré affiché (promo / ancien prix)';
COMMENT ON COLUMN products.classification IS 'Type ou classification catalogue (ex. gel, crème)';

-- Purge catalogue produits (inventaire, ventes lignes, mouvements) — réservé service_role
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

REVOKE ALL ON FUNCTION reset_product_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_product_catalog() TO service_role;

NOTIFY pgrst, 'reload schema';
