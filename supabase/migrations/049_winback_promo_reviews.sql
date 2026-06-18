-- Codes promo win-back uniques (24h) + avis WhatsApp clients

CREATE TABLE IF NOT EXISTS winback_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_winback_promo_customer
  ON winback_promo_codes(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_winback_promo_code
  ON winback_promo_codes(code);

CREATE TABLE IF NOT EXISTS customer_whatsapp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  shopify_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reviews_store
  ON customer_whatsapp_reviews(store_id, created_at DESC);

-- Lien avis Google Natus Guéliz (direct)
UPDATE stores
SET google_review_url = 'https://www.google.com/maps/place/Natus+Marrakech+Gueliz/@31.6343832,-8.3152771,11z/data=!4m12!1m2!2m1!1snatus+marrakech+avis!3m8!1s0xdafee8e56ef5e69:0x22e615f0786def6a!8m2!3d31.6344872!4d-8.0103539!9m1!1b1!15sChRuYXR1cyBtYXJyYWtlY2ggYXZpcyICOAFaFiIUbmF0dXMgbWFycmFrZWNoIGF2aXOSAQ9jb3NsZXRpY3Nfc3RvcmXgAQA!16s%2Fg%2F11df0fndtm?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D'
WHERE name ILIKE '%Guéliz%';

NOTIFY pgrst, 'reload schema';
