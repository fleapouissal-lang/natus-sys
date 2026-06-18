-- Suivi confirmation client WhatsApp (appel caisse après 4 h)

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS cashier_confirmation_status TEXT
    CHECK (
      cashier_confirmation_status IS NULL
      OR cashier_confirmation_status IN (
        'confirmed',
        'not_confirmed',
        'no_response',
        'not_interested'
      )
    ),
  ADD COLUMN IF NOT EXISTS cashier_confirmation_note TEXT,
  ADD COLUMN IF NOT EXISTS cashier_confirmation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cashier_confirmation_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_cashier_confirmation_at
  ON shopify_orders(cashier_confirmation_at DESC)
  WHERE cashier_confirmation_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
