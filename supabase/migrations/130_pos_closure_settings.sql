-- Paramètre directeur : clôture caisse avec ou sans code gérant (tous magasins).

CREATE TABLE IF NOT EXISTS pos_closure_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  require_manager_code BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO pos_closure_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE pos_closure_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pos_closure_settings_select ON pos_closure_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY pos_closure_settings_director_update ON pos_closure_settings
  FOR UPDATE TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

GRANT SELECT, UPDATE ON pos_closure_settings TO authenticated;
GRANT ALL ON pos_closure_settings TO service_role;

CREATE OR REPLACE FUNCTION pos_closure_requires_manager_code()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT require_manager_code FROM pos_closure_settings WHERE id = 1),
    true
  );
$$;

CREATE OR REPLACE FUNCTION get_pos_closure_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row pos_closure_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM pos_closure_settings WHERE id = 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('require_manager_code', true);
  END IF;

  RETURN jsonb_build_object(
    'require_manager_code', v_row.require_manager_code,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_pos_closure_settings(p_require_manager_code BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row pos_closure_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut modifier ce paramètre';
  END IF;

  UPDATE pos_closure_settings
  SET
    require_manager_code = COALESCE(p_require_manager_code, true),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = 1
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'require_manager_code', v_row.require_manager_code,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION compute_next_business_date_after_closure(p_business_date DATE)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_calendar DATE;
  v_next_date DATE;
BEGIN
  v_calendar := store_calendar_date();

  IF p_business_date >= v_calendar THEN
    RETURN p_business_date;
  END IF;

  v_next_date := LEAST(p_business_date + 1, v_calendar);
  IF v_next_date < v_calendar THEN
    v_next_date := v_calendar;
  END IF;

  RETURN v_next_date;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_store_day_closure(
  p_closure_id UUID,
  p_validated_by UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure store_day_closures%ROWTYPE;
  v_store stores%ROWTYPE;
  v_next_date DATE;
BEGIN
  SELECT * INTO v_closure
  FROM store_day_closures
  WHERE id = p_closure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clôture introuvable';
  END IF;

  IF v_closure.status = 'validated' THEN
    SELECT * INTO v_store FROM stores WHERE id = v_closure.store_id;
    RETURN jsonb_build_object(
      'status', 'validated',
      'store_id', v_closure.store_id,
      'store_name', v_store.name,
      'closed_business_date', v_closure.business_date,
      'next_business_date', v_store.current_business_date,
      'stats', v_closure.stats
    );
  END IF;

  IF v_closure.status <> 'pending' THEN
    RAISE EXCEPTION 'Clôture non finalisable';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = v_closure.store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_next_date := compute_next_business_date_after_closure(v_closure.business_date);

  UPDATE store_day_closures
  SET
    status = 'validated',
    validated_by = p_validated_by,
    validated_at = now(),
    cashier_code_confirmed_at = COALESCE(cashier_code_confirmed_at, now())
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

CREATE OR REPLACE FUNCTION request_store_day_closure(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_existing store_day_closures%ROWTYPE;
  v_pending store_day_closures%ROWTYPE;
  v_stats JSONB;
  v_code TEXT;
  v_closure_id UUID;
  v_calendar DATE;
  v_next_date DATE;
  v_result JSONB;
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

  v_calendar := store_calendar_date();

  IF v_store.current_business_date > v_calendar THEN
    RAISE EXCEPTION 'Clôture du prochain jour disponible demain matin';
  END IF;

  SELECT * INTO v_existing
  FROM store_day_closures
  WHERE store_id = p_store_id
    AND business_date = v_store.current_business_date
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = 'validated' THEN
      RAISE EXCEPTION 'Un rapport de clôture existe déjà pour ce jour métier';
    END IF;

    IF NOT pos_closure_requires_manager_code() THEN
      v_stats := compute_store_day_closure_stats(p_store_id, v_existing.business_date);
      UPDATE store_day_closures SET stats = v_stats WHERE id = v_existing.id;
      v_result := finalize_store_day_closure(v_existing.id, auth.uid());
      RETURN v_result || jsonb_build_object('immediate', true, 'require_manager_code', false);
    END IF;

    v_pending := ensure_fresh_store_day_closure(p_store_id);
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
      'code_expires_at', v_pending.code_expires_at,
      'require_manager_code', true
    );
  END IF;

  v_stats := compute_store_day_closure_stats(p_store_id, v_store.current_business_date);

  IF NOT pos_closure_requires_manager_code() THEN
    v_next_date := compute_next_business_date_after_closure(v_store.current_business_date);

    INSERT INTO store_day_closures (
      store_id,
      business_date,
      validation_code,
      status,
      stats,
      requested_by,
      requested_at,
      validated_by,
      validated_at,
      code_expires_at,
      cashier_code_confirmed_at
    )
    VALUES (
      p_store_id,
      v_store.current_business_date,
      '000000',
      'validated',
      v_stats,
      auth.uid(),
      now(),
      auth.uid(),
      now(),
      now(),
      now()
    )
    RETURNING id INTO v_closure_id;

    UPDATE stores
    SET current_business_date = v_next_date
    WHERE id = p_store_id;

    RETURN jsonb_build_object(
      'status', 'validated',
      'id', v_closure_id,
      'business_date', v_store.current_business_date,
      'store_name', v_store.name,
      'stats', v_stats,
      'closed_business_date', v_store.current_business_date,
      'next_business_date', v_next_date,
      'immediate', true,
      'require_manager_code', false
    );
  END IF;

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
    'code_expires_at', now() + store_day_closure_code_ttl(),
    'require_manager_code', true
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT pos_closure_requires_manager_code() THEN
    RAISE EXCEPTION 'La validation par code est désactivée — la clôture se fait directement en caisse';
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

  RETURN finalize_store_day_closure(v_closure.id, auth.uid());
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
  v_calendar DATE;
  v_business_date DATE;
  v_closure_date DATE;
  v_today store_day_closures%ROWTYPE;
  v_pending store_day_closures%ROWTYPE;
  v_show_code BOOLEAN;
  v_can_request BOOLEAN := false;
  v_blocked_reason TEXT := NULL;
  v_require_code BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_access_store(p_store_id) AND NOT is_director() THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  v_require_code := pos_closure_requires_manager_code();
  v_business_date := sync_store_current_business_date(p_store_id);
  v_calendar := store_calendar_date();

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_show_code := v_require_code AND (is_director() OR is_manager());

  IF v_business_date > v_calendar THEN
    v_can_request := false;
    v_blocked_reason := 'Clôture du prochain jour disponible demain matin';
    v_closure_date := v_calendar;
  ELSE
    v_closure_date := v_business_date;
    v_can_request := true;
  END IF;

  SELECT * INTO v_today
  FROM store_day_closures
  WHERE store_id = p_store_id AND business_date = v_closure_date;

  IF v_business_date <= v_calendar THEN
    IF FOUND AND v_today.status = 'validated' THEN
      v_can_request := false;
      v_blocked_reason := 'Jour métier déjà clôturé';
    ELSIF FOUND AND v_today.status = 'pending' THEN
      IF v_require_code THEN
        v_pending := ensure_fresh_store_day_closure(p_store_id);
        v_can_request := false;
        v_blocked_reason := 'Clôture déjà demandée';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_business_date,
    'calendar_date', v_calendar,
    'require_manager_code', v_require_code,
    'can_request_closure', v_can_request,
    'closure_blocked_reason', v_blocked_reason,
    'day_closure_validated', FOUND AND v_today.status = 'validated',
    'validated_closure', CASE
      WHEN NOT FOUND OR v_today.status <> 'validated' THEN NULL
      ELSE jsonb_build_object(
        'id', v_today.id,
        'business_date', v_today.business_date,
        'validated_at', v_today.validated_at,
        'auto_validated', v_today.auto_validated,
        'stats', v_today.stats
      )
    END,
    'pending', CASE
      WHEN NOT v_require_code OR v_pending.id IS NULL THEN NULL
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

GRANT EXECUTE ON FUNCTION pos_closure_requires_manager_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_closure_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION update_pos_closure_settings(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_next_business_date_after_closure(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_store_day_closure(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
