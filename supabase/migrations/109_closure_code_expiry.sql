-- Code de clôture valide 2 h puis renouvelé automatiquement

ALTER TABLE store_day_closures
  ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ;

UPDATE store_day_closures
SET code_expires_at = requested_at + INTERVAL '2 hours'
WHERE code_expires_at IS NULL;

ALTER TABLE store_day_closures
  ALTER COLUMN code_expires_at SET NOT NULL,
  ALTER COLUMN code_expires_at SET DEFAULT (NOW() + INTERVAL '2 hours');

CREATE OR REPLACE FUNCTION store_day_closure_code_ttl()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT INTERVAL '2 hours';
$$;

CREATE OR REPLACE FUNCTION ensure_fresh_store_day_closure(p_store_id UUID)
RETURNS store_day_closures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure store_day_closures%ROWTYPE;
  v_stats JSONB;
  v_code TEXT;
BEGIN
  SELECT * INTO v_closure
  FROM store_day_closures
  WHERE store_id = p_store_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_closure.code_expires_at > now() THEN
    RETURN v_closure;
  END IF;

  v_stats := compute_store_day_closure_stats(p_store_id, v_closure.business_date);
  v_code := generate_store_day_closure_code();

  UPDATE store_day_closures
  SET
    validation_code = v_code,
    code_expires_at = now() + store_day_closure_code_ttl(),
    stats = v_stats,
    cashier_code_confirmed_at = NULL
  WHERE id = v_closure.id
  RETURNING * INTO v_closure;

  RETURN v_closure;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_expired_store_day_closures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  FOR v_store_id IN
    SELECT DISTINCT store_id
    FROM store_day_closures
    WHERE status = 'pending' AND code_expires_at <= now()
  LOOP
    PERFORM ensure_fresh_store_day_closure(v_store_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_fresh_store_day_closure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_expired_store_day_closures() TO authenticated;

CREATE OR REPLACE FUNCTION request_store_day_closure(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_pending store_day_closures%ROWTYPE;
  v_stats JSONB;
  v_code TEXT;
  v_closure_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('cashier', 'manager', 'directeur', 'admin')
  ) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF NOT can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_pending := ensure_fresh_store_day_closure(p_store_id);

  IF v_pending.id IS NOT NULL THEN
    v_stats := compute_store_day_closure_stats(p_store_id, v_pending.business_date);
    UPDATE store_day_closures
    SET stats = v_stats
    WHERE id = v_pending.id;

    RETURN jsonb_build_object(
      'status', 'pending',
      'validation_code', v_pending.validation_code,
      'business_date', v_pending.business_date,
      'store_name', v_store.name,
      'stats', v_stats,
      'requested_at', v_pending.requested_at,
      'code_expires_at', v_pending.code_expires_at
    );
  END IF;

  v_stats := compute_store_day_closure_stats(p_store_id, v_store.current_business_date);
  v_code := generate_store_day_closure_code();

  INSERT INTO store_day_closures (
    store_id,
    business_date,
    validation_code,
    stats,
    requested_by,
    code_expires_at
  )
  VALUES (
    p_store_id,
    v_store.current_business_date,
    v_code,
    v_stats,
    auth.uid(),
    now() + store_day_closure_code_ttl()
  )
  RETURNING id INTO v_closure_id;

  RETURN jsonb_build_object(
    'status', 'created',
    'id', v_closure_id,
    'validation_code', v_code,
    'business_date', v_store.current_business_date,
    'store_name', v_store.name,
    'stats', v_stats,
    'requested_at', now(),
    'code_expires_at', now() + store_day_closure_code_ttl()
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

  IF NOT can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  IF NOT (
    is_store_pos_terminal()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.role = 'cashier'
    )
  ) THEN
    RAISE EXCEPTION 'Seul le compte caisse peut confirmer le code';
  END IF;

  v_code := regexp_replace(trim(COALESCE(p_validation_code, '')), '\D', '', 'g');
  IF length(v_code) <> 6 THEN
    RAISE EXCEPTION 'Code invalide (6 chiffres requis)';
  END IF;

  v_closure := ensure_fresh_store_day_closure(p_store_id);

  IF v_closure.id IS NULL THEN
    RAISE EXCEPTION 'Aucune clôture en attente pour ce magasin';
  END IF;

  IF v_closure.validation_code <> v_code THEN
    RAISE EXCEPTION 'Code expiré ou incorrect — demandez le nouveau code au gérant';
  END IF;

  UPDATE store_day_closures
  SET cashier_code_confirmed_at = COALESCE(cashier_code_confirmed_at, now())
  WHERE id = v_closure.id;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'closure_id', v_closure.id,
    'business_date', v_closure.business_date,
    'cashier_code_confirmed', true,
    'code_expires_at', v_closure.code_expires_at
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
  v_calendar DATE;
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

  IF v_closure.code_expires_at <= now() THEN
    PERFORM ensure_fresh_store_day_closure(v_closure.store_id);
    RAISE EXCEPTION 'Code expiré — un nouveau code a été généré pour le gérant';
  END IF;

  IF NOT is_director() AND NOT (is_manager() AND can_access_store(v_closure.store_id)) THEN
    RAISE EXCEPTION 'Seul le gérant ou le directeur peut valider une clôture';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = v_closure.store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_calendar := store_calendar_date();

  IF v_closure.business_date >= v_calendar THEN
    v_next_date := v_closure.business_date;
  ELSE
    v_next_date := LEAST(v_closure.business_date + 1, v_calendar);
    IF v_next_date < v_calendar THEN
      v_next_date := v_calendar;
    END IF;
  END IF;

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
  v_business_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_access_store(p_store_id) AND NOT is_director() THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  v_business_date := sync_store_current_business_date(p_store_id);

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_show_code := is_director() OR is_manager();
  v_pending := ensure_fresh_store_day_closure(p_store_id);

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_business_date,
    'pending', CASE
      WHEN v_pending.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_pending.id,
        'validation_code', CASE WHEN v_show_code THEN v_pending.validation_code ELSE NULL END,
        'business_date', v_pending.business_date,
        'stats', v_pending.stats,
        'requested_at', v_pending.requested_at,
        'code_expires_at', v_pending.code_expires_at,
        'cashier_code_confirmed', v_pending.cashier_code_confirmed_at IS NOT NULL
      )
    END
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

  PERFORM refresh_expired_store_day_closures();

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
    'code_expires_at', c.code_expires_at,
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

NOTIFY pgrst, 'reload schema';
