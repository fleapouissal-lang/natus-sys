-- Accès pages personnalisé par utilisateur (null = accès complet du rôle)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS allowed_pages TEXT[];

UPDATE profiles
SET allowed_pages = ARRAY['planning', 'stock']::TEXT[]
WHERE access_preset = 'store_planning_stock'
  AND (allowed_pages IS NULL OR cardinality(allowed_pages) = 0);

UPDATE profiles
SET allowed_pages = ARRAY['planning', 'pos', 'sales']::TEXT[]
WHERE access_preset = 'store_planning_pos_sales'
  AND (allowed_pages IS NULL OR cardinality(allowed_pages) = 0);

NOTIFY pgrst, 'reload schema';
