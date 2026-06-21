-- Corrige RLS cashier_shifts : helpers SECURITY DEFINER (comme loyalty / hub)

CREATE OR REPLACE FUNCTION cashier_valid_for_shift(p_cashier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles c
    WHERE c.id = p_cashier_id
      AND c.role = 'cashier'
      AND c.is_active = true
      AND (
        is_director()
        OR store_in_management_city(c.store_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION cashier_valid_for_shift(UUID) TO authenticated;

DROP POLICY IF EXISTS cashier_shifts_select_management ON cashier_shifts;
DROP POLICY IF EXISTS cashier_shifts_select_cashier ON cashier_shifts;
DROP POLICY IF EXISTS cashier_shifts_insert_management ON cashier_shifts;
DROP POLICY IF EXISTS cashier_shifts_update_management ON cashier_shifts;
DROP POLICY IF EXISTS cashier_shifts_delete_management ON cashier_shifts;

CREATE POLICY cashier_shifts_select_management ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

CREATE POLICY cashier_shifts_select_cashier ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    cashier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'cashier' AND p.is_active = true
    )
  );

CREATE POLICY cashier_shifts_insert_management ON cashier_shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_director() OR (is_manager() AND store_in_management_city(store_id)))
    AND cashier_valid_for_shift(cashier_id)
  );

CREATE POLICY cashier_shifts_update_management ON cashier_shifts
  FOR UPDATE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

CREATE POLICY cashier_shifts_delete_management ON cashier_shifts
  FOR DELETE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

NOTIFY pgrst, 'reload schema';
