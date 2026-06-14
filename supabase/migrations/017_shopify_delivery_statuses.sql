-- Statuts livraison : en cours, bien livré, retour

ALTER TABLE shopify_orders
  DROP CONSTRAINT IF EXISTS shopify_orders_workflow_status_check;

ALTER TABLE shopify_orders
  ADD CONSTRAINT shopify_orders_workflow_status_check
  CHECK (workflow_status IN (
    'pending',
    'preparing',
    'ready',
    'shipping',
    'delivered',
    'returned',
    'paid',
    'cancelled'
  ));

NOTIFY pgrst, 'reload schema';
