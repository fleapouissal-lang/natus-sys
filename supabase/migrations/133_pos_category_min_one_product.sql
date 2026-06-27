-- Seuil d'affichage caisse : 1 produit minimum

UPDATE pos_category_cards
SET min_product_count = 1,
    updated_at = now()
WHERE min_product_count <> 1;

ALTER TABLE pos_category_cards
  ALTER COLUMN min_product_count SET DEFAULT 1;

NOTIFY pgrst, 'reload schema';
