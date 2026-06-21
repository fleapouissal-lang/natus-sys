-- Planning caissiers : créneaux par magasin (gérants / direction)

CREATE TABLE IF NOT EXISTS cashier_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cashier_shifts_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_store_date
  ON cashier_shifts(store_id, shift_date, start_time);

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier_date
  ON cashier_shifts(cashier_id, shift_date, start_time);

ALTER TABLE cashier_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY cashier_shifts_select_management ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND (
          p.role IN ('directeur', 'admin')
          OR (p.role = 'manager' AND store_in_management_city(store_id))
        )
    )
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
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND (
          p.role IN ('directeur', 'admin')
          OR (p.role = 'manager' AND store_in_management_city(store_id))
        )
    )
    AND EXISTS (
      SELECT 1 FROM profiles c
      WHERE c.id = cashier_id
        AND c.role = 'cashier'
        AND c.is_active = true
    )
  );

CREATE POLICY cashier_shifts_update_management ON cashier_shifts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND (
          p.role IN ('directeur', 'admin')
          OR (p.role = 'manager' AND store_in_management_city(store_id))
        )
    )
  );

CREATE POLICY cashier_shifts_delete_management ON cashier_shifts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND (
          p.role IN ('directeur', 'admin')
          OR (p.role = 'manager' AND store_in_management_city(store_id))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON cashier_shifts TO authenticated;

NOTIFY pgrst, 'reload schema';
