-- Terminal caisse : lire le planning du caissier opérateur connecté

CREATE POLICY cashier_shifts_select_store_pos_operator ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM pos_operator_sessions s
      JOIN profiles terminal ON terminal.id = s.terminal_user_id
      WHERE s.terminal_user_id = auth.uid()
        AND s.operator_id = cashier_shifts.cashier_id
        AND s.ended_at IS NULL
        AND terminal.is_store_pos = true
        AND terminal.is_active = true
    )
  );

CREATE POLICY cashier_week_offs_select_store_pos_operator ON cashier_week_offs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM pos_operator_sessions s
      JOIN profiles terminal ON terminal.id = s.terminal_user_id
      WHERE s.terminal_user_id = auth.uid()
        AND s.operator_id = cashier_week_offs.cashier_id
        AND s.ended_at IS NULL
        AND terminal.is_store_pos = true
        AND terminal.is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
