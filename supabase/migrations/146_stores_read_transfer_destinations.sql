-- Transferts cross-ville : les gérants et dépôts doivent pouvoir lire les magasins /
-- dépôts destination dans les jointures (sinon to_store_is_hub = false et la commande disparaît).

DROP POLICY IF EXISTS stores_read_transfer_context ON stores;
CREATE POLICY stores_read_transfer_context ON stores
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      is_director_or_admin()
      OR is_management()
      OR (
        COALESCE(is_hub, false) = true
        AND is_hub_operator()
      )
      OR (
        is_hub_operator()
        AND EXISTS (
          SELECT 1
          FROM hub_store_assignments hsa
          WHERE hsa.hub_user_id = auth.uid()
            AND hsa.store_id = stores.id
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
