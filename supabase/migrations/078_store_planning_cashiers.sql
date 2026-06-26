-- Caissiers planning : noms par magasin (sans compte de connexion)

CREATE TABLE IF NOT EXISTS store_planning_cashiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_planning_cashiers_store
  ON store_planning_cashiers(store_id, sort_order, full_name);

-- Reprendre les anciens profils caissiers individuels (même id pour conserver les créneaux)
INSERT INTO store_planning_cashiers (id, store_id, full_name, is_active, sort_order)
SELECT
  p.id,
  p.store_id,
  COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1)),
  p.is_active,
  0
FROM profiles p
WHERE p.role = 'cashier'
  AND COALESCE(p.is_store_pos, false) = false
  AND p.store_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

DELETE FROM cashier_shifts s
WHERE NOT EXISTS (
  SELECT 1 FROM store_planning_cashiers c WHERE c.id = s.cashier_id
);

DELETE FROM cashier_week_offs w
WHERE NOT EXISTS (
  SELECT 1 FROM store_planning_cashiers c WHERE c.id = w.cashier_id
);

DELETE FROM cashier_store_transfers t
WHERE NOT EXISTS (
  SELECT 1 FROM store_planning_cashiers c WHERE c.id = t.cashier_id
);

ALTER TABLE cashier_shifts
  DROP CONSTRAINT IF EXISTS cashier_shifts_cashier_id_fkey;

ALTER TABLE cashier_shifts
  ADD CONSTRAINT cashier_shifts_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES store_planning_cashiers(id) ON DELETE CASCADE;

ALTER TABLE cashier_week_offs
  DROP CONSTRAINT IF EXISTS cashier_week_offs_cashier_id_fkey;

ALTER TABLE cashier_week_offs
  ADD CONSTRAINT cashier_week_offs_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES store_planning_cashiers(id) ON DELETE CASCADE;

ALTER TABLE cashier_store_transfers
  DROP CONSTRAINT IF EXISTS cashier_store_transfers_cashier_id_fkey;

ALTER TABLE cashier_store_transfers
  ADD CONSTRAINT cashier_store_transfers_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES store_planning_cashiers(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION cashier_valid_for_shift(p_cashier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_planning_cashiers c
    WHERE c.id = p_cashier_id
      AND c.is_active = true
      AND (
        is_director()
        OR store_in_management_city(c.store_id)
      )
  );
$$;

ALTER TABLE store_planning_cashiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_planning_cashiers_select ON store_planning_cashiers
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.is_store_pos = true
        AND p.store_id = store_planning_cashiers.store_id
    )
  );

CREATE POLICY store_planning_cashiers_insert ON store_planning_cashiers
  FOR INSERT TO authenticated
  WITH CHECK (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

CREATE POLICY store_planning_cashiers_update ON store_planning_cashiers
  FOR UPDATE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

CREATE POLICY store_planning_cashiers_delete ON store_planning_cashiers
  FOR DELETE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );

DROP POLICY IF EXISTS cashier_shifts_select_cashier ON cashier_shifts;

CREATE POLICY cashier_shifts_select_store_pos ON cashier_shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.is_store_pos = true
        AND p.store_id = cashier_shifts.store_id
    )
  );

DROP POLICY IF EXISTS cashier_week_offs_select_cashier ON cashier_week_offs;

CREATE POLICY cashier_week_offs_select_store_pos ON cashier_week_offs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN store_planning_cashiers c ON c.id = cashier_week_offs.cashier_id
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.is_store_pos = true
        AND p.store_id = c.store_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON store_planning_cashiers TO authenticated;

NOTIFY pgrst, 'reload schema';
