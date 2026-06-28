-- Le livreur doit pouvoir lire les transferts inter-magasins qui lui sont
-- assignés (même logique que hub_stock_transfers_livreur_read). Sans cette
-- policy, un transfert remis au livreur n'apparaît pas dans son compte.

DROP POLICY IF EXISTS store_stock_transfers_livreur_read ON store_stock_transfers;
CREATE POLICY store_stock_transfers_livreur_read ON store_stock_transfers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'livreur'
        AND p.is_active = true
        AND p.id = store_stock_transfers.assigned_livreur_id
    )
  );

-- Le livreur doit aussi lire les lignes produits des transferts qui lui sont
-- assignés.
DROP POLICY IF EXISTS store_stock_transfer_items_livreur_read ON store_stock_transfer_items;
CREATE POLICY store_stock_transfer_items_livreur_read ON store_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM store_stock_transfers t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = store_stock_transfer_items.transfer_id
        AND p.role = 'livreur'
        AND p.is_active = true
        AND t.assigned_livreur_id = p.id
    )
  );

NOTIFY pgrst, 'reload schema';
