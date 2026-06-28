-- Photos optionnelles sur les retours stock (caissier / dépôt)

CREATE TABLE IF NOT EXISTS store_product_writeoff_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writeoff_id UUID NOT NULL REFERENCES store_product_writeoffs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_writeoff_photos_writeoff
  ON store_product_writeoff_photos(writeoff_id, sort_order);

ALTER TABLE store_product_writeoff_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_writeoff_photos_select ON store_product_writeoff_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_product_writeoffs w
      WHERE w.id = writeoff_id
        AND can_access_store(w.store_id)
    )
  );

CREATE POLICY store_writeoff_photos_insert ON store_product_writeoff_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_product_writeoffs w
      WHERE w.id = writeoff_id
        AND w.created_by = auth.uid()
        AND w.status = 'pending'
    )
  );

GRANT SELECT, INSERT ON store_product_writeoff_photos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'writeoff-photos',
  'writeoff-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read writeoff photos" ON storage.objects;
CREATE POLICY "Public read writeoff photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'writeoff-photos');

DROP POLICY IF EXISTS "Writeoff photos upload scoped" ON storage.objects;
CREATE POLICY "Writeoff photos upload scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'writeoff-photos'
    AND (
      EXISTS (
        SELECT 1
        FROM profiles p
        JOIN stores s ON s.id = p.store_id
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'cashier'
          AND (storage.foldername(name))[1] = p.store_id::text
      )
      OR EXISTS (
        SELECT 1
        FROM profiles p
        JOIN stores s ON s.is_hub = true
          AND s.is_active = true
          AND s.city = p.city
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'hub'
          AND (storage.foldername(name))[1] = s.id::text
      )
      OR is_director()
    )
  );

NOTIFY pgrst, 'reload schema';
