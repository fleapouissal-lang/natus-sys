-- Étape 2/2 : schéma livreur/admin (après commit des valeurs enum)

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS assigned_livreur_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_orders_livreur
  ON shopify_orders(assigned_livreur_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_livreur_per_store
  ON profiles(store_id)
  WHERE role = 'livreur' AND is_active = true AND store_id IS NOT NULL;

-- Admin = même accès plateforme que directeur
CREATE OR REPLACE FUNCTION is_director()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('directeur', 'admin')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_livreur()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'livreur' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'cashier';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('manager', 'cashier', 'directeur', 'livreur', 'admin') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, city)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    NULLIF(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    city = COALESCE(EXCLUDED.city, profiles.city);

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Livreur read assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur read assigned shopify orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (
    is_livreur()
    AND store_id = user_store_id()
    AND assigned_livreur_id = auth.uid()
  );

DROP POLICY IF EXISTS "Livreur update assigned shopify orders" ON shopify_orders;
CREATE POLICY "Livreur update assigned shopify orders" ON shopify_orders
  FOR UPDATE TO authenticated
  USING (
    is_livreur()
    AND store_id = user_store_id()
    AND assigned_livreur_id = auth.uid()
  )
  WITH CHECK (
    is_livreur()
    AND store_id = user_store_id()
    AND assigned_livreur_id = auth.uid()
  );

DROP POLICY IF EXISTS "Managers read city profiles" ON profiles;
CREATE POLICY "Managers read city profiles" ON profiles
  FOR SELECT USING (
    is_manager() AND (
      id = auth.uid()
      OR (
        role IN ('cashier', 'livreur')
        AND store_in_management_city(store_id)
      )
    )
  );

DROP POLICY IF EXISTS "Managers update city cashiers" ON profiles;
CREATE POLICY "Managers update city store staff" ON profiles
  FOR UPDATE USING (
    is_manager()
    AND role IN ('cashier', 'livreur')
    AND store_in_management_city(store_id)
  );

NOTIFY pgrst, 'reload schema';
