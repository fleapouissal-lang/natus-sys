-- Dépôt hub : voir les transferts entrants (magasin → dépôt) et sortants (dépôt → magasin)
-- même si le magasin source est dans une autre ville.

CREATE OR REPLACE FUNCTION hub_operator_can_access_transfer(
  p_from_store_id UUID,
  p_to_store_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_hub_operator()
    AND (
      EXISTS (
        SELECT 1
        FROM stores s
        WHERE s.id = p_to_store_id
          AND COALESCE(s.is_hub, false) = true
          AND s.city = hub_user_city()
      )
      OR EXISTS (
        SELECT 1
        FROM stores s
        WHERE s.id = p_from_store_id
          AND COALESCE(s.is_hub, false) = true
          AND s.city = hub_user_city()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION hub_operator_can_access_transfer(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS hub_stock_transfers_hub_read ON hub_stock_transfers;
CREATE POLICY hub_stock_transfers_hub_read ON hub_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR hub_operator_can_access_transfer(from_store_id, to_store_id)
    OR (
      is_management()
      AND can_access_store(to_store_id)
    )
    OR (
      is_management()
      AND can_access_store(from_store_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'cashier'
          AND p.store_id = hub_stock_transfers.to_store_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'cashier'
          AND p.store_id = hub_stock_transfers.from_store_id
      )
    )
  );

DROP POLICY IF EXISTS hub_stock_transfer_items_read ON hub_stock_transfer_items;
CREATE POLICY hub_stock_transfer_items_read ON hub_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM hub_stock_transfers t
      WHERE t.id = transfer_id
        AND (
          is_director()
          OR hub_operator_can_access_transfer(t.from_store_id, t.to_store_id)
          OR (
            is_management()
            AND can_access_store(t.to_store_id)
          )
          OR (
            is_management()
            AND can_access_store(t.from_store_id)
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'cashier'
              AND p.store_id = t.to_store_id
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'cashier'
              AND p.store_id = t.from_store_id
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'livreur'
              AND p.id = t.assigned_livreur_id
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
