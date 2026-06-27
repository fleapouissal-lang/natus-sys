-- Un seul rapport de clôture par magasin et par jour métier

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY store_id, business_date
      ORDER BY
        CASE status WHEN 'validated' THEN 0 ELSE 1 END,
        validated_at DESC NULLS LAST,
        requested_at DESC
    ) AS rn
  FROM store_day_closures
)
DELETE FROM store_day_closures c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_day_closures_one_per_store_day
  ON store_day_closures(store_id, business_date);

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
  v_today store_day_closures%ROWTYPE;
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

  SELECT * INTO v_today
  FROM store_day_closures
  WHERE store_id = p_store_id
    AND business_date = v_business_date;

  IF FOUND AND v_today.status = 'pending' THEN
    v_pending := ensure_fresh_store_day_closure(p_store_id);
  END IF;

  RETURN jsonb_build_object(
    'store_id', v_store.id,
    'store_name', v_store.name,
    'business_date', v_business_date,
    'day_closure_validated', FOUND AND v_today.status = 'validated',
    'validated_closure', CASE
      WHEN NOT FOUND OR v_today.status <> 'validated' THEN NULL
      ELSE jsonb_build_object(
        'id', v_today.id,
        'business_date', v_today.business_date,
        'validated_at', v_today.validated_at,
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
