-- Avis publics pour natusmarrakech.com (page Google Reviews)

CREATE OR REPLACE FUNCTION get_public_store_reviews(p_store_name TEXT DEFAULT 'Natus Guéliz')
RETURNS TABLE (
  customer_name TEXT,
  rating INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.customer_name,
    r.rating,
    r.message,
    r.created_at
  FROM customer_whatsapp_reviews r
  JOIN stores s ON s.id = r.store_id
  WHERE s.name ILIKE p_store_name
    AND r.rating >= 1
    AND r.rating <= 5
  ORDER BY r.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION get_public_store_review_store(p_store_name TEXT DEFAULT 'Natus Guéliz')
RETURNS TABLE (
  store_name TEXT,
  city TEXT,
  google_review_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.name, s.city, s.google_review_url
  FROM stores s
  WHERE s.name ILIKE p_store_name
    AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_store_reviews(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_public_store_review_store(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
