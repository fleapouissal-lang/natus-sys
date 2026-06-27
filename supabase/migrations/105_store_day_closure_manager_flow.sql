-- Clôture caisse : validation gérant, code caissier pour impression, historique rapports

ALTER TABLE store_day_closures
  ADD COLUMN IF NOT EXISTS cashier_code_confirmed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION get_store_pos_day_state(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_pending store_day_closures%ROWTYPE;
  v_show_code BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_access_store(p_store_id) AND NOT is_director() THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_show_code := is_director() OR is_manager();

  SELECT * INTO v_pending
  FROM store_day_closures
  WHERE store_id = p_store_id AND status = 'pending'
  ORDER BY requested_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_store.current_business_date,
    'pending', CASE
      WHEN v_pending.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_pending.id,
        'validation_code', CASE WHEN v_show_code THEN v_pending.validation_code ELSE NULL END,
        'business_date', v_pending.business_date,
        'stats', v_pending.stats,
        'requested_at', v_pending.requested_at,
        'cashier_code_confirmed', v_pending.cashier_code_confirmed_at IS NOT NULL
      )
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION confirm_store_day_closure_code(
  p_store_id UUID,
  p_validation_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_closure store_day_closures%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'cashier'
  ) THEN
    RAISE EXCEPTION 'Seul le caissier peut confirmer le code';
  END IF;

  IF NOT can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  v_code := regexp_replace(trim(COALESCE(p_validation_code, '')), '\D', '', 'g');
  IF length(v_code) <> 6 THEN
    RAISE EXCEPTION 'Code invalide (6 chiffres requis)';
  END IF;

  SELECT * INTO v_closure
  FROM store_day_closures
  WHERE store_id = p_store_id
    AND status = 'pending'
    AND validation_code = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code incorrect ou clôture déjà validée';
  END IF;

  UPDATE store_day_closures
  SET cashier_code_confirmed_at = COALESCE(cashier_code_confirmed_at, now())
  WHERE id = v_closure.id;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'closure_id', v_closure.id,
    'business_date', v_closure.business_date
  );
END;
$$;

CREATE OR REPLACE FUNCTION validate_store_day_closure(p_validation_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_closure store_day_closures%ROWTYPE;
  v_store stores%ROWTYPE;
  v_next_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_code := regexp_replace(trim(COALESCE(p_validation_code, '')), '\D', '', 'g');
  IF length(v_code) <> 6 THEN
    RAISE EXCEPTION 'Code invalide (6 chiffres requis)';
  END IF;

  SELECT * INTO v_closure
  FROM store_day_closures
  WHERE validation_code = v_code AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code introuvable ou déjà validé';
  END IF;

  IF NOT is_director() AND NOT (is_manager() AND can_access_store(v_closure.store_id)) THEN
    RAISE EXCEPTION 'Seul le gérant ou le directeur peut valider une clôture';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = v_closure.store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_next_date := v_closure.business_date + 1;

  UPDATE store_day_closures
  SET
    status = 'validated',
    validated_by = auth.uid(),
    validated_at = now()
  WHERE id = v_closure.id;

  UPDATE stores
  SET current_business_date = v_next_date
  WHERE id = v_store.id;

  RETURN jsonb_build_object(
    'status', 'validated',
    'store_id', v_store.id,
    'store_name', v_store.name,
    'closed_business_date', v_closure.business_date,
    'next_business_date', v_next_date,
    'stats', v_closure.stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION list_pending_store_day_closures()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() AND NOT is_manager() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', c.id,
    'store_id', c.store_id,
    'store_name', s.name,
    'store_city', s.city,
    'business_date', c.business_date,
    'validation_code', c.validation_code,
    'stats', c.stats,
    'requested_at', c.requested_at,
    'requested_by_name', COALESCE(p.full_name, p.email),
    'cashier_code_confirmed', c.cashier_code_confirmed_at IS NOT NULL
  )
  FROM store_day_closures c
  JOIN stores s ON s.id = c.store_id
  JOIN profiles p ON p.id = c.requested_by
  WHERE c.status = 'pending'
    AND (is_director() OR can_access_store(c.store_id))
  ORDER BY c.requested_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION list_store_day_closures(
  p_store_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 60
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_profile_store UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_profile_store
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_role = 'cashier' THEN
    IF v_profile_store IS NULL THEN
      RAISE EXCEPTION 'Magasin non assigné';
    END IF;
    p_store_id := v_profile_store;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', c.id,
    'store_id', c.store_id,
    'store_name', s.name,
    'store_city', s.city,
    'business_date', c.business_date,
    'status', c.status,
    'validation_code', CASE
      WHEN is_director() OR is_manager() THEN c.validation_code
      ELSE NULL
    END,
    'stats', c.stats,
    'requested_at', c.requested_at,
    'requested_by_name', COALESCE(pr.full_name, pr.email),
    'validated_at', c.validated_at,
    'validated_by_name', COALESCE(pv.full_name, pv.email),
    'cashier_code_confirmed', c.cashier_code_confirmed_at IS NOT NULL
  )
  FROM store_day_closures c
  JOIN stores s ON s.id = c.store_id
  JOIN profiles pr ON pr.id = c.requested_by
  LEFT JOIN profiles pv ON pv.id = c.validated_by
  WHERE (p_store_id IS NULL OR c.store_id = p_store_id)
    AND (
      is_director()
      OR (is_manager() AND can_access_store(c.store_id))
      OR (v_role = 'cashier' AND c.store_id = v_profile_store)
    )
  ORDER BY c.requested_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 60), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_store_day_closure_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_store_day_closures(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
