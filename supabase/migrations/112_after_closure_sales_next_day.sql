-- Après validation gérant : nouvelles ventes sur le jour métier suivant
-- Clôture en attente : ventes encore sur le jour calendaire en cours

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
    v_next_date := v_calendar + 1;
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
    validated_at = now(),
    stats = compute_store_day_closure_stats(v_closure.store_id, v_closure.business_date)
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
    'stats', compute_store_day_closure_stats(v_closure.store_id, v_closure.business_date)
  );
END;
$$;

UPDATE stores s
SET current_business_date = store_calendar_date() + 1
WHERE EXISTS (
  SELECT 1
  FROM store_day_closures c
  WHERE c.store_id = s.id
    AND c.business_date = store_calendar_date()
    AND c.status = 'validated'
)
AND current_business_date <= store_calendar_date();

UPDATE sales s
SET business_date = store_calendar_date() + 1
FROM store_day_closures c
WHERE c.store_id = s.store_id
  AND c.business_date = store_calendar_date()
  AND c.status = 'validated'
  AND c.validated_at IS NOT NULL
  AND s.created_at >= c.validated_at
  AND s.business_date = store_calendar_date()
  AND s.cancelled_at IS NULL;

NOTIFY pgrst, 'reload schema';
