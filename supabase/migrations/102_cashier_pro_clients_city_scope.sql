-- Caissiers : voir les clients Pro de toute la ville (pas seulement leur magasin d'inscription)

CREATE OR REPLACE FUNCTION store_in_same_city_as(p_store_a UUID, p_store_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stores a
    JOIN stores b ON a.city = b.city
    WHERE a.id = p_store_a
      AND b.id = p_store_b
  );
$$;

DROP POLICY IF EXISTS "Cashier read customers" ON customers;
CREATE POLICY "Cashier read customers" ON customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND (
          customers.store_id IS NULL
          OR p.store_id IS NULL
          OR customers.store_id = p.store_id
          OR (
            customers.is_pro_client = true
            AND p.store_id IS NOT NULL
            AND customers.store_id IS NOT NULL
            AND store_in_same_city_as(p.store_id, customers.store_id)
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
