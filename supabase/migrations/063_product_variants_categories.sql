-- Produits parents / variantes + catégories multiples

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_kind TEXT NOT NULL DEFAULT 'simple'
    CHECK (product_kind IN ('simple', 'parent', 'variant')),
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

UPDATE products
SET categories = ARRAY[category]
WHERE category IS NOT NULL
  AND category <> ''
  AND (categories IS NULL OR categories = '{}');

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE products ALTER COLUMN barcode DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique_idx
  ON products (barcode)
  WHERE barcode IS NOT NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_parent_kind_check;
ALTER TABLE products ADD CONSTRAINT products_parent_kind_check CHECK (
  (product_kind = 'parent' AND parent_id IS NULL) OR
  (product_kind = 'variant' AND parent_id IS NOT NULL) OR
  (product_kind = 'simple' AND parent_id IS NULL)
);

CREATE OR REPLACE FUNCTION products_sync_category_from_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.category := CASE
    WHEN array_length(NEW.categories, 1) > 0 THEN NEW.categories[1]
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_category_trigger ON products;
CREATE TRIGGER products_sync_category_trigger
  BEFORE INSERT OR UPDATE OF categories ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_sync_category_from_categories();

CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_kind ON products(product_kind);
