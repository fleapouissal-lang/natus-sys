-- Détails chèques liés aux ventes caisse

CREATE TABLE sale_cheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id),
  bank_name TEXT NOT NULL CHECK (char_length(trim(bank_name)) > 0),
  cheque_number TEXT NOT NULL CHECK (char_length(trim(cheque_number)) > 0),
  cheque_amount NUMERIC(10, 2) NOT NULL CHECK (cheque_amount > 0),
  drawer_name TEXT,
  issue_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_cheques_store_created
  ON sale_cheques (store_id, created_at DESC);

CREATE INDEX idx_sale_cheques_bank
  ON sale_cheques (bank_name, created_at DESC);

ALTER TABLE sale_cheques ENABLE ROW LEVEL SECURITY;

CREATE POLICY sale_cheques_read ON sale_cheques
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (
      is_manager()
      AND store_in_management_city(store_id)
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = true
          AND p.role = 'cashier'
          AND p.store_id = sale_cheques.store_id
      )
    )
    OR (
      is_hub_operator()
      AND store_in_hub_city(store_id)
    )
  );

CREATE POLICY sale_cheques_insert ON sale_cheques
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
        AND s.payment_method = 'cheque'
        AND s.store_id = store_id
        AND (
          is_director()
          OR (is_manager() AND store_in_management_city(store_id))
          OR (
            EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = auth.uid()
                AND p.is_active = true
                AND p.role IN ('cashier', 'manager', 'directeur', 'admin')
            )
          )
        )
    )
  );

GRANT SELECT, INSERT ON sale_cheques TO authenticated;
GRANT ALL ON sale_cheques TO service_role;

NOTIFY pgrst, 'reload schema';
