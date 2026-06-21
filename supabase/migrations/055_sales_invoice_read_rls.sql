-- Lecture des ventes / factures par magasin (caissier) et par ville hub (retail).

CREATE OR REPLACE FUNCTION user_assigned_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT store_id FROM profiles
  WHERE id = auth.uid()
    AND role = 'cashier'
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION can_read_store_sale(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    is_management()
    OR (
      user_assigned_store_id() IS NOT NULL
      AND p_store_id = user_assigned_store_id()
    )
    OR (
      is_hub_operator()
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = p_store_id
          AND s.city = hub_user_city()
          AND s.is_hub = false
      )
    );
$$;

GRANT EXECUTE ON FUNCTION user_assigned_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION can_read_store_sale(UUID) TO authenticated;

CREATE POLICY "Cashiers read store sales" ON sales
  FOR SELECT USING (
    user_assigned_store_id() IS NOT NULL
    AND store_id = user_assigned_store_id()
  );

CREATE POLICY "Hub read retail store sales" ON sales
  FOR SELECT USING (
    is_hub_operator()
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_id
        AND s.city = hub_user_city()
        AND s.is_hub = false
    )
  );

DROP POLICY IF EXISTS "Read sale items via sale access" ON sale_items;

CREATE POLICY "Read sale items via sale access" ON sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
      AND (
        s.cashier_id = auth.uid()
        OR is_management()
        OR can_read_store_sale(s.store_id)
      )
    )
  );
