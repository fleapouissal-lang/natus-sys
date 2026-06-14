-- Évite récursion RLS profiles ↔ stores (login bloqué)

CREATE OR REPLACE FUNCTION user_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT store_id FROM profiles
  WHERE id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION store_in_management_city(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_store_id AND s.city = management_city()
  );
$$;

CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'manager' AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "Read stores by role" ON stores;
CREATE POLICY "Read stores by role" ON stores
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND city = management_city())
    OR user_store_id() = stores.id
  );

DROP POLICY IF EXISTS "Managers read city profiles" ON profiles;
CREATE POLICY "Managers read city profiles" ON profiles
  FOR SELECT USING (
    is_manager() AND (
      id = auth.uid()
      OR (role = 'cashier' AND store_in_management_city(store_id))
    )
  );

DROP POLICY IF EXISTS "Managers update city cashiers" ON profiles;
CREATE POLICY "Managers update city cashiers" ON profiles
  FOR UPDATE USING (
    is_manager()
    AND role = 'cashier'
    AND store_in_management_city(store_id)
  );

DROP POLICY IF EXISTS "Management manage store inventory" ON store_inventory;
CREATE POLICY "Management manage store inventory" ON store_inventory
  FOR ALL USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
  );
