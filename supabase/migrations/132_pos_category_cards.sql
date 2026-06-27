-- Cartes catégories POS (image + seuil d'affichage caisse)

CREATE TABLE IF NOT EXISTS pos_category_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  min_product_count int NOT NULL DEFAULT 11 CHECK (min_product_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_category_cards_name_unique UNIQUE (name),
  CONSTRAINT pos_category_cards_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_pos_category_cards_sort
  ON pos_category_cards (sort_order, name);

ALTER TABLE pos_category_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read pos category cards" ON pos_category_cards;
CREATE POLICY "Authenticated read pos category cards" ON pos_category_cards
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Director manage pos category cards" ON pos_category_cards;
CREATE POLICY "Director manage pos category cards" ON pos_category_cards
  FOR ALL TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pos-category-cards',
  'pos-category-cards',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read pos category card images" ON storage.objects;
CREATE POLICY "Public read pos category card images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pos-category-cards');

DROP POLICY IF EXISTS "Director upload pos category card images" ON storage.objects;
CREATE POLICY "Director upload pos category card images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pos-category-cards' AND is_director());

DROP POLICY IF EXISTS "Director update pos category card images" ON storage.objects;
CREATE POLICY "Director update pos category card images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pos-category-cards' AND is_director());

DROP POLICY IF EXISTS "Director delete pos category card images" ON storage.objects;
CREATE POLICY "Director delete pos category card images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pos-category-cards' AND is_director());

INSERT INTO pos_category_cards (name, slug, image_url, sort_order, min_product_count)
VALUES
  ('Accueil', 'accueil', NULL, 1, 11),
  ('Visage', 'visage', '/images/categories/visage.png', 2, 11),
  ('Corps', 'corps', '/images/categories/corps.png', 3, 11),
  ('Cheveux', 'cheveux', '/images/categories/cheveux.png', 4, 11),
  ('Hammam', 'hammam', '/images/categories/hammam.png', 5, 11),
  ('Maison', 'maison', NULL, 6, 11),
  ('Coffrets', 'coffrets', '/images/categories/coffrets.png', 7, 11),
  ('Enfants', 'enfants', '/images/categories/enfants.png', 8, 11),
  ('Homme', 'homme', '/images/categories/homme.png', 9, 11),
  ('Soleil', 'soleil', '/images/categories/soleil.png', 10, 11),
  ('Voyage', 'voyage', '/images/categories/voyage.png', 11, 11)
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  image_url = COALESCE(pos_category_cards.image_url, EXCLUDED.image_url),
  sort_order = EXCLUDED.sort_order,
  min_product_count = EXCLUDED.min_product_count,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
