-- Catégorie de repli pour les produits dont la catégorie POS a été supprimée

INSERT INTO pos_category_cards (name, slug, image_url, sort_order, min_product_count)
VALUES ('Produits sans catégorie', 'produits-sans-categorie', NULL, 9999, 1)
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order,
  min_product_count = EXCLUDED.min_product_count,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
