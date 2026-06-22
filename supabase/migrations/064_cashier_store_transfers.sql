-- Transferts de caissiers entre magasins (définitif ou temporaire)

CREATE TABLE IF NOT EXISTS cashier_store_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  to_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('permanent', 'temporary')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (kind = 'permanent' OR end_date IS NOT NULL),
  CHECK (from_store_id <> to_store_id)
);

CREATE INDEX IF NOT EXISTS idx_cashier_store_transfers_cashier
  ON cashier_store_transfers (cashier_id, start_date);
CREATE INDEX IF NOT EXISTS idx_cashier_store_transfers_to_store
  ON cashier_store_transfers (to_store_id, start_date, end_date);

ALTER TABLE cashier_store_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY cashier_store_transfers_select ON cashier_store_transfers
  FOR SELECT TO authenticated
  USING (
    public.is_director()
    OR EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id IN (cashier_store_transfers.from_store_id, cashier_store_transfers.to_store_id)
        AND public.store_in_management_city(s.id)
    )
  );

CREATE POLICY cashier_store_transfers_insert ON cashier_store_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_director()
    OR (
      public.store_in_management_city(from_store_id)
      AND public.store_in_management_city(to_store_id)
    )
  );

GRANT SELECT, INSERT ON cashier_store_transfers TO authenticated;
