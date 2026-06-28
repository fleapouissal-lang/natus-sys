-- Après store_planning_cashiers (078), la lecture des repos par gérant
-- pointait encore vers profiles.id = cashier_id (toujours vide).

DROP POLICY IF EXISTS cashier_week_offs_select_management ON cashier_week_offs;

CREATE POLICY cashier_week_offs_select_management ON cashier_week_offs
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (
      is_manager()
      AND EXISTS (
        SELECT 1
        FROM store_planning_cashiers c
        WHERE c.id = cashier_week_offs.cashier_id
          AND store_in_management_city(c.store_id)
      )
    )
  );

NOTIFY pgrst, 'reload schema';
