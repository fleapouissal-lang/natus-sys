-- Clôture demain désactivée le soir + clôture auto si oubli caissier (sans gérant)

ALTER TABLE store_day_closures
  ADD COLUMN IF NOT EXISTS auto_validated BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION store_pos_terminal_profile_id(p_store_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM profiles
  WHERE store_id = p_store_id
    AND is_store_pos = true
    AND is_active = true
  ORDER BY created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auto_close_missing_store_days(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_calendar DATE;
  v_date DATE;
  v_closure store_day_closures%ROWTYPE;
  v_stats JSONB;
  v_actor UUID;
BEGIN
  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_calendar := store_calendar_date();
  v_date := v_store.current_business_date;
  v_actor := store_pos_terminal_profile_id(p_store_id);

  WHILE v_date < v_calendar LOOP
    SELECT * INTO v_closure
    FROM store_day_closures
    WHERE store_id = p_store_id AND business_date = v_date
    FOR UPDATE;

    IF NOT FOUND OR v_closure.status <> 'validated' THEN
      v_stats := compute_store_day_closure_stats(p_store_id, v_date);

      IF FOUND AND v_closure.status = 'pending' THEN
        UPDATE store_day_closures
        SET
          status = 'validated',
          validated_at = now(),
          stats = v_stats,
          auto_validated = true
        WHERE id = v_closure.id;
      ELSE
        INSERT INTO store_day_closures (
          store_id,
          business_date,
          validation_code,
          status,
          stats,
          requested_by,
          requested_at,
          validated_at,
          code_expires_at,
          auto_validated
        )
        VALUES (
          p_store_id,
          v_date,
          '000000',
          'validated',
          v_stats,
          COALESCE(
            v_actor,
            (SELECT id FROM profiles WHERE store_id = p_store_id AND is_active = true LIMIT 1)
          ),
          now(),
          now(),
          now(),
          true
        );
      END IF;
    END IF;

    v_date := v_date + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION auto_close_all_stores_missing_days()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  FOR v_store IN SELECT id FROM stores WHERE is_active = true ORDER BY name
  LOOP
    PERFORM auto_close_missing_store_days(v_store.id);
    PERFORM sync_store_current_business_date(v_store.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('stores_processed', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION auto_close_all_stores_missing_days() TO service_role;

CREATE OR REPLACE FUNCTION sync_store_current_business_date(p_store_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current DATE;
  v_calendar DATE;
  v_next DATE;
BEGIN
  PERFORM auto_close_missing_store_days(p_store_id);

  SELECT current_business_date INTO v_current
  FROM stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN store_calendar_date();
  END IF;

  v_calendar := store_calendar_date();
  v_next := COALESCE(v_current, v_calendar);

  IF EXISTS (
    SELECT 1
    FROM store_day_closures
    WHERE store_id = p_store_id
      AND business_date = v_calendar
      AND status = 'pending'
  ) THEN
    v_next := v_calendar;
  ELSIF EXISTS (
    SELECT 1
    FROM store_day_closures
    WHERE store_id = p_store_id
      AND business_date = v_calendar
      AND status = 'validated'
  ) THEN
    v_next := v_calendar + 1;
  ELSE
    IF v_next > v_calendar + 1 THEN
      v_next := LEAST(v_next, v_calendar + 1);
    END IF;

    IF v_next < v_calendar AND EXISTS (
      SELECT 1
      FROM store_day_closures
      WHERE store_id = p_store_id
        AND status = 'validated'
        AND business_date = v_next
    ) THEN
      v_next := v_calendar;
    END IF;
  END IF;

  UPDATE stores
  SET current_business_date = v_next
  WHERE id = p_store_id
    AND current_business_date IS DISTINCT FROM v_next;

  RETURN v_next;
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT can_access_store(p_store_id) AND NOT is_director() THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  v_business_date := sync_store_current_business_date(p_store_id);
  v_calendar := store_calendar_date();

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  v_show_code := is_director() OR is_manager();

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
      v_pending := ensure_fresh_store_day_closure(p_store_id);
      v_can_request := false;
      v_blocked_reason := 'Clôture déjà demandée';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_business_date,
    'calendar_date', v_calendar,
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

NOTIFY pgrst, 'reload schema';
