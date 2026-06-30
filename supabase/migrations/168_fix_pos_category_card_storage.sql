-- Renforcer les politiques storage des images catégories POS (upsert / remplacement)

DROP POLICY IF EXISTS "Director update pos category card images" ON storage.objects;
CREATE POLICY "Director update pos category card images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pos-category-cards' AND is_director())
  WITH CHECK (bucket_id = 'pos-category-cards' AND is_director());

NOTIFY pgrst, 'reload schema';
