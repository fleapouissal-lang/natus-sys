-- Fix confirmation code caissier (compte caisse magasin is_store_pos) + accès élargi

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
    'business_date', v_closure.business_date,
    'cashier_code_confirmed', true
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
