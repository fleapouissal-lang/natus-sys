-- Corrige récursion infinie RLS sur stores (policy 022 + embed PostgREST)

DROP POLICY IF EXISTS "Cashier read order transfer stores" ON stores;

DROP POLICY IF EXISTS "Read stores by role" ON stores;
CREATE POLICY "Read stores by role" ON stores
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND city = management_city())
    OR user_store_id() = stores.id
  );

NOTIFY pgrst, 'reload schema';
