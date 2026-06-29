-- Corrige store_day_closures.requested_by NULL lors de la clôture auto
-- (ex. directeur ou dépôt sans compte caisse POS is_store_pos).

CREATE OR REPLACE FUNCTION resolve_store_closure_requested_by(p_store_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := store_pos_terminal_profile_id(p_store_id);
  IF v_actor IS NOT NULL THEN
    RETURN v_actor;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_active = true
    ) THEN
      RETURN auth.uid();
    END IF;
  END IF;

  SELECT id INTO v_actor
  FROM profiles
  WHERE store_id = p_store_id
    AND is_active = true
  ORDER BY is_store_pos DESC, created_at
  LIMIT 1;

  IF v_actor IS NOT NULL THEN
    RETURN v_actor;
  END IF;

  SELECT p.id INTO v_actor
  FROM profiles p
  JOIN stores s ON s.id = p_store_id
  WHERE p.is_active = true
    AND p.role = 'hub'
    AND EXISTS (
      SELECT 1 FROM stores hs
      WHERE hs.id = p.store_id
        AND hs.is_hub = true
        AND hs.city = s.city
    )
  ORDER BY p.created_at
  LIMIT 1;

  IF v_actor IS NOT NULL THEN
    RETURN v_actor;
  END IF;

  SELECT id INTO v_actor
  FROM profiles
  WHERE is_active = true
    AND role IN ('directeur', 'admin')
  ORDER BY created_at
  LIMIT 1;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Impossible de clôturer : aucun utilisateur associé au magasin';
  END IF;

  RETURN v_actor;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_store_closure_requested_by(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_store_closure_requested_by(UUID) TO service_role;

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
  v_actor := resolve_store_closure_requested_by(p_store_id);

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
          auto_validated = true,
          requested_by = COALESCE(requested_by, v_actor)
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
          v_actor,
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

NOTIFY pgrst, 'reload schema';
