-- Realtime : notifications caisse sur nouvelles commandes Shopify

ALTER TABLE shopify_orders REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE shopify_orders;

NOTIFY pgrst, 'reload schema';
