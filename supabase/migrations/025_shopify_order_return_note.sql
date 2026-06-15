-- Note obligatoire sur retour livreur

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS return_note TEXT,
  ADD COLUMN IF NOT EXISTS return_note_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_note_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_return_note_at
  ON shopify_orders(return_note_at DESC)
  WHERE return_note IS NOT NULL;

NOTIFY pgrst, 'reload schema';
