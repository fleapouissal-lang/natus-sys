-- Commandes Shopify synchronisées et affectées aux magasins

ALTER TABLE stores ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE TABLE shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id BIGINT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  shipping_lat DOUBLE PRECISION,
  shipping_lng DOUBLE PRECISION,
  financial_status TEXT,
  fulfillment_status TEXT,
  order_status TEXT NOT NULL DEFAULT 'open',
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shopify_created_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_orders_store ON shopify_orders(store_id);
CREATE INDEX idx_shopify_orders_city ON shopify_orders(city);
CREATE INDEX idx_shopify_orders_created ON shopify_orders(shopify_created_at DESC);

ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Director read all shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (is_director());

CREATE POLICY "Manager read city shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (is_manager() AND city = management_city());

CREATE POLICY "Cashier read store shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (user_store_id() = store_id);

-- Service role / webhooks insèrent via admin client (bypass RLS)
