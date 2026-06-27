-- Accès temporaire modification stock (gérant / dépôt → validation directeur)

CREATE TYPE stock_modify_access_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE stock_modify_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  requester_role TEXT NOT NULL CHECK (requester_role IN ('manager', 'hub')),
  status stock_modify_access_status NOT NULL DEFAULT 'pending',
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  hub_store_id UUID REFERENCES stores(id),
  request_note TEXT,
  review_note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_modify_access_dates CHECK (valid_to >= valid_from)
);

CREATE TABLE stock_modify_access_request_stores (
  request_id UUID NOT NULL REFERENCES stock_modify_access_requests(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, store_id)
);

CREATE INDEX idx_stock_modify_access_requester
  ON stock_modify_access_requests (requester_id, created_at DESC);

CREATE INDEX idx_stock_modify_access_pending
  ON stock_modify_access_requests (status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX idx_stock_modify_access_approved
  ON stock_modify_access_requests (requester_id, status, valid_from, valid_to)
  WHERE status = 'approved';

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS access_request_id UUID REFERENCES stock_modify_access_requests(id) ON DELETE SET NULL;

CREATE INDEX idx_stock_movements_access_request
  ON stock_movements (access_request_id, created_at DESC)
  WHERE access_request_id IS NOT NULL;

ALTER TABLE stock_modify_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_modify_access_request_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_modify_access_read ON stock_modify_access_requests
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR requester_id = auth.uid()
  );

CREATE POLICY stock_modify_access_insert ON stock_modify_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_role IN ('manager', 'hub')
    AND status = 'pending'
  );

CREATE POLICY stock_modify_access_director_update ON stock_modify_access_requests
  FOR UPDATE TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

CREATE POLICY stock_modify_access_stores_read ON stock_modify_access_request_stores
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR EXISTS (
      SELECT 1 FROM stock_modify_access_requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  );

CREATE POLICY stock_modify_access_stores_insert ON stock_modify_access_request_stores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_modify_access_requests r
      WHERE r.id = request_id
        AND r.requester_id = auth.uid()
        AND r.status = 'pending'
    )
  );

NOTIFY pgrst, 'reload schema';
