-- Liste des livreurs par ville pour assignation transferts (caisse, gérant, hub, directeur)

CREATE OR REPLACE FUNCTION list_city_livreurs(p_city TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role user_role;
  v_store_id UUID;
  v_profile_city TEXT;
  v_store_city TEXT;
  v_allowed BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_city IS NULL OR trim(p_city) = '' THEN
    RAISE EXCEPTION 'Ville requise';
  END IF;

  SELECT role, store_id, city
  INTO v_role, v_store_id, v_profile_city
  FROM profiles
  WHERE id = v_user_id AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF is_director_or_admin() THEN
    v_allowed := true;
  ELSIF v_role = 'manager' AND management_city() = p_city THEN
    v_allowed := true;
  ELSIF v_role = 'hub' AND hub_user_city() = p_city THEN
    v_allowed := true;
  ELSIF v_role = 'cashier' AND v_store_id IS NOT NULL THEN
    SELECT s.city INTO v_store_city
    FROM stores s
    WHERE s.id = v_store_id AND s.is_active = true;

    v_allowed := v_store_city = p_city;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Non autorisé à lister les livreurs de cette ville';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'role', p.role,
          'city', p.city,
          'is_active', p.is_active
        )
        ORDER BY p.full_name NULLS LAST, p.email
      )
      FROM profiles p
      WHERE p.role = 'livreur'
        AND p.is_active = true
        AND p.city = p_city
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION list_city_livreurs(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
