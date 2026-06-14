-- Corrige la récursion RLS sur profiles (login → "Profil introuvable")
-- Les helpers doivent bypasser RLS comme is_manager() en 001.

CREATE OR REPLACE FUNCTION is_director()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'directeur' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_management()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('directeur', 'manager') AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION management_city()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT city FROM profiles
  WHERE id = auth.uid() AND role = 'manager' AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION can_access_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
$$;
