-- Autoriser la création de profils via le trigger auth (supabase_auth_admin)
CREATE POLICY "Auth admin can insert profiles"
ON profiles FOR INSERT
TO supabase_auth_admin
WITH CHECK (true);

CREATE POLICY "Auth admin can read profiles"
ON profiles FOR SELECT
TO supabase_auth_admin
USING (true);

-- Trigger sécurisé avec search_path explicite
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'cashier';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('manager', 'cashier') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
