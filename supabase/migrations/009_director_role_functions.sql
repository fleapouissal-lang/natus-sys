-- Partie 2 : fonctions et policies utilisant le rôle 'directeur'
-- (s'exécute après le commit de 007)

CREATE OR REPLACE FUNCTION is_director()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'directeur' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_management()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('directeur', 'manager') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION management_city()
RETURNS TEXT AS $$
  SELECT city FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_access_store(p_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN is_director() THEN true
    WHEN is_manager() THEN EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = p_store_id AND s.city = management_city()
    )
    ELSE EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.store_id = p_store_id AND p.is_active = true
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger profil : rôle directeur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'cashier';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('manager', 'cashier', 'directeur') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies magasins : gérant limité à sa ville
DROP POLICY IF EXISTS "Authenticated can read stores" ON stores;
DROP POLICY IF EXISTS "Managers can manage stores" ON stores;

CREATE POLICY "Read stores by role" ON stores
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_manager() AND city = management_city())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.store_id = stores.id AND p.is_active = true
    )
  );

CREATE POLICY "Management insert stores" ON stores
  FOR INSERT TO authenticated
  WITH CHECK (
    is_director()
    OR (is_manager() AND city = management_city())
  );

CREATE POLICY "Management update stores" ON stores
  FOR UPDATE TO authenticated
  USING (
    is_director()
    OR (is_manager() AND city = management_city())
  );

-- Profils : directeur voit tout, gérant voit sa ville
DROP POLICY IF EXISTS "Managers can read all profiles" ON profiles;

CREATE POLICY "Directors read all profiles" ON profiles
  FOR SELECT USING (is_director());

CREATE POLICY "Managers read city profiles" ON profiles
  FOR SELECT USING (
    is_manager() AND (
      id = auth.uid()
      OR (
        role = 'cashier'
        AND EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = profiles.store_id AND s.city = management_city()
        )
      )
    )
  );

CREATE POLICY "Directors update profiles" ON profiles
  FOR UPDATE USING (is_director());

CREATE POLICY "Managers update city cashiers" ON profiles
  FOR UPDATE USING (
    is_manager()
    AND role = 'cashier'
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = profiles.store_id AND s.city = management_city()
    )
  );

-- Produits : directeur + gérant
DROP POLICY IF EXISTS "Managers can insert products" ON products;
DROP POLICY IF EXISTS "Managers can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

CREATE POLICY "Management insert products" ON products
  FOR INSERT WITH CHECK (is_management());

CREATE POLICY "Management update products" ON products
  FOR UPDATE USING (is_management());

CREATE POLICY "Management delete products" ON products
  FOR DELETE USING (is_management());

-- Ventes : directeur voit tout
DROP POLICY IF EXISTS "Managers can read all sales" ON sales;

CREATE POLICY "Management read all sales" ON sales
  FOR SELECT USING (is_management());

DROP POLICY IF EXISTS "Read sale items via sale access" ON sale_items;

CREATE POLICY "Read sale items via sale access" ON sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
      AND (s.cashier_id = auth.uid() OR is_management())
    )
  );

-- Stock movements
DROP POLICY IF EXISTS "Managers can read stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Managers can insert stock movements" ON stock_movements;

CREATE POLICY "Management read stock movements" ON stock_movements
  FOR SELECT USING (is_management());

CREATE POLICY "Management insert stock movements" ON stock_movements
  FOR INSERT WITH CHECK (is_management());

-- Inventaire magasin
DROP POLICY IF EXISTS "Managers can manage store inventory" ON store_inventory;

CREATE POLICY "Management manage store inventory" ON store_inventory
  FOR ALL USING (
    is_director()
    OR (is_manager() AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_id AND s.city = management_city()
    ))
  )
  WITH CHECK (
    is_director()
    OR (is_manager() AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_id AND s.city = management_city()
    ))
  );

-- Storage : directeur aussi
DROP POLICY IF EXISTS "Managers upload category product images" ON storage.objects;
DROP POLICY IF EXISTS "Managers update category product images" ON storage.objects;
DROP POLICY IF EXISTS "Managers delete category product images" ON storage.objects;

CREATE POLICY "Management upload category product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN (
      'soin-visage', 'maquillage', 'nettoyage', 'parfum',
      'corps', 'cheveux', 'accessoires'
    ) AND is_management()
  );

CREATE POLICY "Management update category product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN (
      'soin-visage', 'maquillage', 'nettoyage', 'parfum',
      'corps', 'cheveux', 'accessoires'
    ) AND is_management()
  );

CREATE POLICY "Management delete category product images" ON storage.objects
  FOR DELETE USING (
    bucket_id IN (
      'soin-visage', 'maquillage', 'nettoyage', 'parfum',
      'corps', 'cheveux', 'accessoires'
    ) AND is_management()
  );
