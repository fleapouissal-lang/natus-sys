-- Supabase Storage : un bucket public par catégorie produit

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('soin-visage', 'soin-visage', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('maquillage', 'maquillage', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('nettoyage', 'nettoyage', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('parfum', 'parfum', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('corps', 'corps', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('cheveux', 'cheveux', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('accessoires', 'accessoires', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique des images produits
CREATE POLICY "Public read category product images"
ON storage.objects FOR SELECT
USING (bucket_id IN (
  'soin-visage', 'maquillage', 'nettoyage', 'parfum',
  'corps', 'cheveux', 'accessoires'
));

-- Gérants : upload / modification / suppression
CREATE POLICY "Managers upload category product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum',
    'corps', 'cheveux', 'accessoires'
  )
  AND is_manager()
);

CREATE POLICY "Managers update category product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum',
    'corps', 'cheveux', 'accessoires'
  )
  AND is_manager()
);

CREATE POLICY "Managers delete category product images"
ON storage.objects FOR DELETE
USING (
  bucket_id IN (
    'soin-visage', 'maquillage', 'nettoyage', 'parfum',
    'corps', 'cheveux', 'accessoires'
  )
  AND is_manager()
);
