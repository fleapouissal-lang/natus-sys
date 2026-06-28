-- Caissiers : lire les magasins retail actifs pour afficher Source / Destination
-- des transferts inter-magasins (jointures PostgREST).

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
      OR (
        COALESCE(is_hub, false) = true
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'cashier'
            AND p.is_active = true
        )
      )
      OR (
        COALESCE(is_hub, false) = false
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'cashier'
            AND p.is_active = true
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
