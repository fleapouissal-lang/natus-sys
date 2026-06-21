-- Jour de repos hebdomadaire par caissier (une date par semaine)

CREATE TABLE IF NOT EXISTS cashier_week_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  off_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cashier_week_offs_one_per_week UNIQUE (cashier_id, week_start),
  CONSTRAINT cashier_week_offs_date_in_week CHECK (
    off_date >= week_start AND off_date <= (week_start + INTERVAL '6 days')::date
  )
);

CREATE INDEX IF NOT EXISTS idx_cashier_week_offs_week
  ON cashier_week_offs(week_start, off_date);

ALTER TABLE cashier_week_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cashier_week_offs_select_management ON cashier_week_offs
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND EXISTS (
      SELECT 1 FROM profiles c
      WHERE c.id = cashier_id
        AND c.role = 'cashier'
        AND store_in_management_city(c.store_id)
    ))
  );

CREATE POLICY cashier_week_offs_select_cashier ON cashier_week_offs
  FOR SELECT TO authenticated
  USING (cashier_id = auth.uid());

CREATE POLICY cashier_week_offs_insert_management ON cashier_week_offs
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_director() OR (is_manager() AND cashier_valid_for_shift(cashier_id)))
  );

CREATE POLICY cashier_week_offs_update_management ON cashier_week_offs
  FOR UPDATE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND cashier_valid_for_shift(cashier_id))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND cashier_valid_for_shift(cashier_id))
  );

CREATE POLICY cashier_week_offs_delete_management ON cashier_week_offs
  FOR DELETE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND cashier_valid_for_shift(cashier_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON cashier_week_offs TO authenticated;

NOTIFY pgrst, 'reload schema';
