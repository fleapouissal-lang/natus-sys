-- Dépôt hub : voir toutes les commandes dont la source est un magasin associé
-- (hub_store_assignments), quelle que soit la destination.

CREATE OR REPLACE FUNCTION hub_store_assigned_to_operator(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hub_store_assignments hsa
    WHERE hsa.hub_user_id = auth.uid()
      AND hsa.store_id = p_store_id
  );
$$;

GRANT EXECUTE ON FUNCTION hub_store_assigned_to_operator(UUID) TO authenticated;

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
      OR hub_store_assigned_to_operator(p_from_store_id)
    );
$$;

DROP POLICY IF EXISTS store_stock_transfers_read ON store_stock_transfers;
CREATE POLICY store_stock_transfers_read ON store_stock_transfers
  FOR SELECT TO authenticated
  USING (
    is_director_or_admin()
    OR (
      is_manager()
      AND (
        can_access_store(from_store_id)
        OR can_access_store(to_store_id)
      )
    )
    OR (
      is_hub_operator()
      AND hub_store_assigned_to_operator(from_store_id)
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
        AND p.store_id IN (from_store_id, to_store_id)
    )
  );

DROP POLICY IF EXISTS store_stock_transfer_items_read ON store_stock_transfer_items;
CREATE POLICY store_stock_transfer_items_read ON store_stock_transfer_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_stock_transfers t
      WHERE t.id = transfer_id
        AND (
          is_director_or_admin()
          OR (
            is_manager()
            AND (
              can_access_store(t.from_store_id)
              OR can_access_store(t.to_store_id)
            )
          )
          OR (
            is_hub_operator()
            AND hub_store_assigned_to_operator(t.from_store_id)
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.is_active = true
              AND p.store_id IN (t.from_store_id, t.to_store_id)
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
