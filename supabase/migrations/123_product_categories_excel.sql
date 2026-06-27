-- Buckets Storage pour les catégories catalogue Excel

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('accueil', 'accueil', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('visage', 'visage', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('hammam', 'hammam', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('maison', 'maison', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('coffrets', 'coffrets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('enfants', 'enfants', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('homme', 'homme', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('soleil', 'soleil', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('voyage', 'voyage', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read category product images" ON storage.objects;
CREATE POLICY "Public read category product images"
ON storage.objects FOR SELECT
USING (bucket_id IN (
  'soin-visage', 'maquillage', 'nettoyage', 'parfum', 'corps', 'cheveux', 'accessoires',
  'accueil', 'visage', 'hammam', 'maison', 'coffrets', 'enfants', 'homme', 'soleil', 'voyage'
));

DROP POLICY IF EXISTS "Managers upload category product images" ON storage.objects;
CREATE POLICY "Managers upload category product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum', 'corps', 'cheveux', 'accessoires',
    'accueil', 'visage', 'hammam', 'maison', 'coffrets', 'enfants', 'homme', 'soleil', 'voyage'
  )
  AND is_manager()
);

DROP POLICY IF EXISTS "Managers update category product images" ON storage.objects;
CREATE POLICY "Managers update category product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum', 'corps', 'cheveux', 'accessoires',
    'accueil', 'visage', 'hammam', 'maison', 'coffrets', 'enfants', 'homme', 'soleil', 'voyage'
  )
  AND is_manager()
);

DROP POLICY IF EXISTS "Managers delete category product images" ON storage.objects;
CREATE POLICY "Managers delete category product images"
ON storage.objects FOR DELETE
USING (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum', 'corps', 'cheveux', 'accessoires',
    'accueil', 'visage', 'hammam', 'maison', 'coffrets', 'enfants', 'homme', 'soleil', 'voyage'
  )
  AND is_manager()
);

NOTIFY pgrst, 'reload schema';
