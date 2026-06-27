-- Statuts chèques + modification / suppression avec fenêtre 30 min caissier

CREATE TYPE sale_cheque_status AS ENUM (
  'pending',
  'deposited',
  'received',
  'rejected'
);

ALTER TABLE sale_cheques
  ADD COLUMN IF NOT EXISTS status sale_cheque_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_cheques_status
  ON sale_cheques (status, created_at DESC);

CREATE OR REPLACE FUNCTION is_director_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('directeur', 'admin')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION update_sale_cheque_status(
  p_cheque_id UUID,
  p_status sale_cheque_status
)
RETURNS UUID AS $$
DECLARE
  v_cheque sale_cheques%ROWTYPE;
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF v_role NOT IN ('manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Seuls le gérant et le directeur peuvent modifier le statut';
  END IF;

  SELECT * INTO v_cheque
  FROM sale_cheques
  WHERE id = p_cheque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chèque introuvable';
  END IF;

  IF v_role = 'manager' AND NOT store_in_management_city(v_cheque.store_id) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  UPDATE sale_cheques
  SET
    status = p_status,
    status_updated_at = NOW(),
    status_updated_by = auth.uid(),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_cheque_id;

  RETURN p_cheque_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION update_sale_cheque_details(
  p_cheque_id UUID,
  p_bank_name TEXT,
  p_cheque_number TEXT,
  p_cheque_amount NUMERIC,
  p_drawer_name TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cheque sale_cheques%ROWTYPE;
  v_role user_role;
  v_store_id UUID;
  v_sale sales%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF char_length(trim(COALESCE(p_bank_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Banque requise';
  END IF;

  IF char_length(trim(COALESCE(p_cheque_number, ''))) = 0 THEN
    RAISE EXCEPTION 'Numéro de chèque requis';
  END IF;

  IF p_cheque_amount IS NULL OR p_cheque_amount <= 0 THEN
    RAISE EXCEPTION 'Montant du chèque invalide';
  END IF;

  SELECT * INTO v_cheque
  FROM sale_cheques
  WHERE id = p_cheque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chèque introuvable';
  END IF;

  SELECT * INTO v_sale FROM sales WHERE id = v_cheque.sale_id;

  IF v_sale.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Vente annulée — modification impossible';
  END IF;

  IF p_cheque_amount < v_sale.total THEN
    RAISE EXCEPTION 'Le montant du chèque doit couvrir le total de la vente';
  END IF;

  IF is_director_or_admin() THEN
    NULL;
  ELSIF v_role = 'cashier' THEN
    IF v_cheque.created_by <> auth.uid() THEN
      RAISE EXCEPTION 'Vous ne pouvez modifier que vos propres chèques';
    END IF;
    IF v_cheque.store_id <> v_store_id THEN
      RAISE EXCEPTION 'Ce chèque ne concerne pas votre magasin';
    END IF;
    IF v_cheque.created_at < NOW() - INTERVAL '30 minutes' THEN
      RAISE EXCEPTION 'Modification impossible après 30 min — contactez le directeur';
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE sale_cheques
  SET
    bank_name = trim(p_bank_name),
    cheque_number = trim(p_cheque_number),
    cheque_amount = p_cheque_amount,
    drawer_name = NULLIF(trim(COALESCE(p_drawer_name, '')), ''),
    issue_date = p_issue_date,
    notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_cheque_id;

  RETURN p_cheque_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION delete_sale_cheque(p_cheque_id UUID)
RETURNS UUID AS $$
DECLARE
  v_cheque sale_cheques%ROWTYPE;
  v_role user_role;
  v_store_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role, store_id INTO v_role, v_store_id
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  SELECT * INTO v_cheque
  FROM sale_cheques
  WHERE id = p_cheque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chèque introuvable';
  END IF;

  IF is_director_or_admin() THEN
    NULL;
  ELSIF v_role = 'cashier' THEN
    IF v_cheque.created_by <> auth.uid() THEN
      RAISE EXCEPTION 'Vous ne pouvez supprimer que vos propres chèques';
    END IF;
    IF v_cheque.store_id <> v_store_id THEN
      RAISE EXCEPTION 'Ce chèque ne concerne pas votre magasin';
    END IF;
    IF v_cheque.created_at < NOW() - INTERVAL '30 minutes' THEN
      RAISE EXCEPTION 'Suppression impossible après 30 min — contactez le directeur';
    END IF;
  ELSE
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  PERFORM cancel_sale(v_cheque.sale_id);

  RETURN p_cheque_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION update_sale_cheque_status(UUID, sale_cheque_status) TO authenticated;
GRANT EXECUTE ON FUNCTION update_sale_cheque_details(UUID, TEXT, TEXT, NUMERIC, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_sale_cheque(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
