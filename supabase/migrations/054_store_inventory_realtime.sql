-- Realtime : alertes stock caissier / gérant + réceptions hub

ALTER TABLE store_inventory REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE store_inventory;

ALTER TABLE hub_stock_transfers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE hub_stock_transfers;
