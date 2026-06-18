-- Étape 2/2 : schéma hub stock (après commit de la valeur enum hub)

-- Un hub stock par ville (remplace l'unicité globale)
DROP INDEX IF EXISTS idx_stores_single_hub;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_hub_per_city
  ON stores (city)
  WHERE is_hub = true;

-- Hub stock pour chaque ville Natus (si absent)
INSERT INTO stores (name, city, address, is_hub, is_active)
SELECT
  'Natus Stock ' || city,
  city,
  'Zone logistique — ' || city,
  true,
  true
FROM (
  VALUES
    ('Marrakech'),
    ('Casablanca'),
    ('Rabat'),
    ('Fès'),
    ('Tanger'),
    ('Agadir')
) AS cities(city)
WHERE NOT EXISTS (
  SELECT 1 FROM stores s WHERE s.is_hub = true AND s.city = cities.city
);

INSERT INTO store_inventory (store_id, product_id, stock)
SELECT s.id, p.id, GREATEST(p.stock, 100)
FROM stores s
CROSS JOIN products p
WHERE s.is_hub = true
ON CONFLICT (store_id, product_id) DO NOTHING;

-- Gérants affectés à un compte hub
CREATE TABLE IF NOT EXISTS hub_manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hub_user_id, manager_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_manager_hub ON hub_manager_assignments(hub_user_id);
CREATE INDEX IF NOT EXISTS idx_hub_manager_manager ON hub_manager_assignments(manager_id);

ALTER TABLE hub_manager_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_hub_operator()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'hub' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION hub_user_city()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT city FROM profiles
  WHERE id = auth.uid() AND role = 'hub' AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION store_in_hub_city(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_store_id
      AND s.city = hub_user_city()
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
  IF NEW.raw_user_meta_data->>'role' IN ('manager', 'cashier', 'directeur', 'livreur', 'admin', 'hub') THEN
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

-- Auto-affecter les gérants actifs de la ville au nouveau compte hub
CREATE OR REPLACE FUNCTION auto_assign_hub_managers(p_hub_user_id UUID, p_city TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO hub_manager_assignments (hub_user_id, manager_id)
  SELECT p_hub_user_id, p.id
  FROM profiles p
  WHERE p.role = 'manager'
    AND p.is_active = true
    AND p.city = p_city
  ON CONFLICT (hub_user_id, manager_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION auto_assign_hub_managers(UUID, TEXT) TO authenticated;

-- Policies hub_manager_assignments
CREATE POLICY hub_assignments_director_all ON hub_manager_assignments
  FOR ALL TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

CREATE POLICY hub_assignments_hub_read ON hub_manager_assignments
  FOR SELECT TO authenticated
  USING (hub_user_id = auth.uid() OR is_director());

-- Stores : hub voit tous les magasins de sa ville
DROP POLICY IF EXISTS "Read stores by role" ON stores;
CREATE POLICY "Read stores by role" ON stores
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND city = management_city())
    OR (is_hub_operator() AND city = hub_user_city())
    OR user_store_id() = stores.id
  );

-- store_inventory : hub gère le stock de sa ville
DROP POLICY IF EXISTS "Management manage store inventory" ON store_inventory;
CREATE POLICY "Management manage store inventory" ON store_inventory
  FOR ALL TO authenticated
  USING (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
    OR (is_hub_operator() AND store_in_hub_city(store_id))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND store_in_management_city(store_id))
    OR (is_hub_operator() AND store_in_hub_city(store_id))
  );

-- Profiles : hub lit gérants/caissiers/livreurs de sa ville
DROP POLICY IF EXISTS "Hub read city staff" ON profiles;
CREATE POLICY "Hub read city staff" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_hub_operator()
    AND (
      id = auth.uid()
      OR (
        role IN ('manager', 'cashier', 'livreur')
        AND city = hub_user_city()
      )
    )
  );

NOTIFY pgrst, 'reload schema';
