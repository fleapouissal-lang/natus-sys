-- Journal d'actualités internes (gérants / direction → équipes ciblées)

CREATE TYPE news_audience_type AS ENUM (
  'all',
  'city',
  'managers_city',
  'cashiers_city',
  'hub_city',
  'livreurs_city',
  'store',
  'roles'
);

CREATE TABLE news_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2),
  body TEXT NOT NULL CHECK (char_length(trim(body)) >= 4),
  audience_type news_audience_type NOT NULL DEFAULT 'city',
  target_city TEXT,
  target_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  target_roles TEXT[],
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_announcements_published
  ON news_announcements(published_at DESC);

CREATE INDEX idx_news_announcements_city
  ON news_announcements(target_city)
  WHERE target_city IS NOT NULL;

CREATE TABLE news_announcement_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES news_announcements(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_announcement_images_announcement
  ON news_announcement_images(announcement_id, sort_order);

ALTER TABLE news_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_announcement_images ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le personnel authentifié (filtrage audience côté app)
CREATE POLICY news_announcements_select_authenticated ON news_announcements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY news_announcement_images_select_authenticated ON news_announcement_images
  FOR SELECT TO authenticated
  USING (true);

-- Écriture : direction ou gérant
CREATE POLICY news_announcements_insert_management ON news_announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_director() OR is_manager());

CREATE POLICY news_announcements_update_management ON news_announcements
  FOR UPDATE TO authenticated
  USING (is_director() OR (is_manager() AND created_by = auth.uid()))
  WITH CHECK (is_director() OR (is_manager() AND created_by = auth.uid()));

CREATE POLICY news_announcements_delete_management ON news_announcements
  FOR DELETE TO authenticated
  USING (is_director() OR (is_manager() AND created_by = auth.uid()));

CREATE POLICY news_announcement_images_insert_management ON news_announcement_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM news_announcements n
      WHERE n.id = announcement_id
        AND (is_director() OR (is_manager() AND n.created_by = auth.uid()))
    )
  );

CREATE POLICY news_announcement_images_delete_management ON news_announcement_images
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM news_announcements n
      WHERE n.id = announcement_id
        AND (is_director() OR (is_manager() AND n.created_by = auth.uid()))
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON news_announcements TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON news_announcement_images TO authenticated, service_role;

-- Stockage images actualités
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read news images" ON storage.objects;
CREATE POLICY "Public read news images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'news-images');

DROP POLICY IF EXISTS "Management upload news images" ON storage.objects;
CREATE POLICY "Management upload news images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'news-images'
    AND (is_director() OR is_manager())
  );

NOTIFY pgrst, 'reload schema';
