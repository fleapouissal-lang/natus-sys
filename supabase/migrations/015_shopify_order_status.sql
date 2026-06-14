-- Statuts commande Shopify + paiement COD / en ligne

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'online'
    CHECK (payment_type IN ('online', 'cod')),
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (workflow_status IN ('pending', 'preparing', 'ready', 'delivered', 'paid', 'cancelled')),
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_workflow ON shopify_orders(workflow_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_payment_type ON shopify_orders(payment_type);

-- Mise à jour des commandes existantes
UPDATE shopify_orders
SET workflow_status = CASE
  WHEN financial_status = 'paid' THEN 'paid'
  WHEN order_status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE workflow_status = 'pending';

UPDATE shopify_orders
SET payment_type = 'cod'
WHERE financial_status IN ('pending', 'partially_paid')
  AND payment_type = 'online';

GRANT UPDATE ON public.shopify_orders TO authenticated;

CREATE POLICY "Director update shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

CREATE POLICY "Manager update city shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (is_manager() AND city = management_city())
  WITH CHECK (is_manager() AND city = management_city());

CREATE POLICY "Cashier update store shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (user_store_id() = store_id)
  WITH CHECK (user_store_id() = store_id);

NOTIFY pgrst, 'reload schema';
