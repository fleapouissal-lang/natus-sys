-- Magasin hub stock parent (Casablanca) + transfert de commandes entre magasins

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_hub BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_single_hub
  ON stores ((true))
  WHERE is_hub = true;

INSERT INTO stores (name, city, address, is_hub, is_active)
SELECT
  'Natus Stock Casablanca',
  'Casablanca',
  'Zone logistique Sidi Bernoussi, Casablanca',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE is_hub = true);

INSERT INTO store_inventory (store_id, product_id, stock)
SELECT s.id, p.id, GREATEST(p.stock, 100)
FROM stores s
CROSS JOIN products p
WHERE s.is_hub = true
ON CONFLICT (store_id, product_id) DO UPDATE
  SET stock = GREATEST(store_inventory.stock, EXCLUDED.stock);

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS store_assignment_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transferred_from_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_transferred_from
  ON shopify_orders(transferred_from_store_id);

NOTIFY pgrst, 'reload schema';
