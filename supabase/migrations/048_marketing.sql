-- Marketing : win-back, cross-sell, avis Google, stories produit, offres geo

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS google_review_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS promo_label TEXT DEFAULT '-10%',
  ADD COLUMN IF NOT EXISTS geo_offer_text TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS whatsapp_winback_sent_at TIMESTAMPTZ;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS whatsapp_cross_sell_sent_at TIMESTAMPTZ;

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS whatsapp_cross_sell_sent_at TIMESTAMPTZ;

-- Offres par défaut (Guéliz / Médina Marrakech)
UPDATE stores
SET
  google_review_url = COALESCE(
    google_review_url,
    'https://maps.google.com/?cid=placeholder-gueliz'
  ),
  promo_code = COALESCE(promo_code, 'NATUS10'),
  promo_label = COALESCE(promo_label, '-10%'),
  geo_offer_text = COALESCE(
    geo_offer_text,
    'Offre Guéliz : livraison offerte dès 300 DH avec le code NATUS10'
  )
WHERE name ILIKE '%Guéliz%';

UPDATE stores
SET
  google_review_url = COALESCE(
    google_review_url,
    'https://maps.google.com/?cid=placeholder-medina'
  ),
  promo_code = COALESCE(promo_code, 'MEDINA10'),
  promo_label = COALESCE(promo_label, '-10%'),
  geo_offer_text = COALESCE(
    geo_offer_text,
    'Offre Médina : -10% sur votre prochain achat en magasin avec MEDINA10'
  )
WHERE name ILIKE '%Médina%';

-- Liens courts produit
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS short_links_kind_check;
ALTER TABLE short_links
  ADD CONSTRAINT short_links_kind_check
  CHECK (kind IN ('order', 'loyalty_card', 'product'));

CREATE OR REPLACE FUNCTION get_or_create_short_link(p_kind TEXT, p_token UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'abcdefghijkmnpqrstuvwxyz23456789';
  i INT;
BEGIN
  IF p_kind NOT IN ('order', 'loyalty_card', 'product') THEN
    RAISE EXCEPTION 'invalid short link kind: %', p_kind;
  END IF;

  SELECT code INTO v_code
  FROM short_links
  WHERE kind = p_kind AND token = p_token;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;

    BEGIN
      INSERT INTO short_links (code, kind, token)
      VALUES (v_code, p_kind, p_token);
      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT sl.code INTO v_code
        FROM short_links sl
        WHERE sl.kind = p_kind AND sl.token = p_token;
        IF v_code IS NOT NULL THEN
          RETURN v_code;
        END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION get_public_product(p_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  category TEXT,
  brand TEXT,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.brand,
    p.image_url
  FROM products p
  WHERE p.id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_product(UUID) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
