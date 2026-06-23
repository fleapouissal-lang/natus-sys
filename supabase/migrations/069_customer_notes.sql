-- Notes client sur carte fidélité (commandes Shopify, suivi caisse, WhatsApp)

CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shopify_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('shopify_order', 'cashier_follow_up', 'whatsapp')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id, created_at DESC);
CREATE INDEX idx_customer_notes_shopify_order ON customer_notes(shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

CREATE UNIQUE INDEX idx_customer_notes_shopify_order_once
  ON customer_notes(shopify_order_id)
  WHERE shopify_order_id IS NOT NULL AND source = 'shopify_order';

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Director read customer notes" ON customer_notes
  FOR SELECT TO authenticated
  USING (is_director());

CREATE POLICY "Manager read city customer notes" ON customer_notes
  FOR SELECT TO authenticated
  USING (
    is_manager()
    AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
        AND (c.store_id IS NULL OR store_in_management_city(c.store_id))
    )
  );

CREATE POLICY "Cashier read customer notes" ON customer_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN customers c ON c.id = customer_notes.customer_id
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND (
          c.store_id IS NULL
          OR p.store_id IS NULL
          OR c.store_id = p.store_id
        )
    )
  );

GRANT SELECT ON customer_notes TO authenticated;

NOTIFY pgrst, 'reload schema';
