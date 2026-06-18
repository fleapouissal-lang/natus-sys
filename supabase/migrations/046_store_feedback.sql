-- Avis / réclamations clients (WhatsApp après livraison ou achat magasin)

CREATE TABLE IF NOT EXISTS store_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('shopify_delivery', 'pos_sale')),
  shopify_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_store_complaints_store_created
  ON store_complaints(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_complaints_new
  ON store_complaints(status, created_at DESC)
  WHERE status = 'new';

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS whatsapp_delivery_feedback_sent_at TIMESTAMPTZ;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS whatsapp_service_feedback_sent_at TIMESTAMPTZ;

ALTER TABLE whatsapp_bot_sessions
  ADD COLUMN IF NOT EXISTS pending_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feedback_source TEXT CHECK (
    feedback_source IS NULL OR feedback_source IN ('shopify_delivery', 'pos_sale')
  );

ALTER TABLE store_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_complaints_select_director ON store_complaints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('directeur', 'admin')
        AND p.is_active = true
    )
  );

CREATE POLICY store_complaints_select_manager ON store_complaints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.id = store_complaints.store_id
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.is_active = true
        AND p.city = s.city
    )
  );

CREATE POLICY store_complaints_select_cashier ON store_complaints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.store_id = store_complaints.store_id
    )
  );

CREATE POLICY store_complaints_update_director ON store_complaints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('directeur', 'admin')
        AND p.is_active = true
    )
  );

CREATE POLICY store_complaints_update_manager ON store_complaints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN stores s ON s.id = store_complaints.store_id
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND p.is_active = true
        AND p.city = s.city
    )
  );

CREATE POLICY store_complaints_update_cashier ON store_complaints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.store_id = store_complaints.store_id
    )
  );

NOTIFY pgrst, 'reload schema';
