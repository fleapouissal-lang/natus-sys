-- Lien commande Shopify ↔ vente caisse

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_sale ON shopify_orders(sale_id);

NOTIFY pgrst, 'reload schema';
