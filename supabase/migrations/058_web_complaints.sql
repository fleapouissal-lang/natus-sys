-- Formulaire public réclamations clients (web)

ALTER TABLE store_complaints DROP CONSTRAINT IF EXISTS store_complaints_source_check;
ALTER TABLE store_complaints
  ADD CONSTRAINT store_complaints_source_check
  CHECK (source IN (
    'shopify_delivery',
    'pos_sale',
    'web_service',
    'web_order',
    'web_other'
  ));

ALTER TABLE store_complaints
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE store_complaints ALTER COLUMN store_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_complaints_order_number
  ON store_complaints(order_number)
  WHERE order_number IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-photos',
  'complaint-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read complaint photos" ON storage.objects;
CREATE POLICY "Public read complaint photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'complaint-photos');

CREATE OR REPLACE FUNCTION get_public_complaint_cities()
RETURNS TABLE (city TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.city
  FROM stores s
  WHERE s.is_active = true
  ORDER BY s.city;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION get_public_complaint_stores(p_city TEXT)
RETURNS TABLE (id UUID, name TEXT, city TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.city
  FROM stores s
  WHERE s.is_active = true
    AND s.city = p_city
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_complaint_cities() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_public_complaint_stores(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
