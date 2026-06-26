-- Client Pro : QR fixe par magasin + sessions d'inscription 15 min

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS pro_client_token UUID UNIQUE DEFAULT gen_random_uuid();

UPDATE stores
SET pro_client_token = gen_random_uuid()
WHERE pro_client_token IS NULL;

ALTER TABLE stores
  ALTER COLUMN pro_client_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_pro_client_token
  ON stores(pro_client_token);

CREATE TABLE IF NOT EXISTS pro_client_registration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_client_sessions_token
  ON pro_client_registration_sessions(session_token);

CREATE OR REPLACE FUNCTION get_store_pro_client_link(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_store stores%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid() AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  IF v_profile.role NOT IN ('cashier', 'manager', 'directeur', 'admin', 'hub') THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF NOT can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'Accès magasin refusé';
  END IF;

  SELECT * INTO v_store FROM stores WHERE id = p_store_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Magasin introuvable';
  END IF;

  RETURN jsonb_build_object(
    'store_token', v_store.pro_client_token,
    'store_id', v_store.id,
    'store_name', v_store.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION begin_pro_client_registration(p_store_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_session pro_client_registration_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_store
  FROM stores
  WHERE pro_client_token = p_store_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  INSERT INTO pro_client_registration_sessions (store_id, expires_at)
  VALUES (v_store.id, now() + interval '15 minutes')
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'status', 'open',
    'session_token', v_session.session_token,
    'expires_at', v_session.expires_at,
    'store_name', v_store.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION submit_pro_client_registration_session(
  p_session_token UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session pro_client_registration_sessions%ROWTYPE;
  v_phone TEXT;
  v_email TEXT;
  v_company TEXT;
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM pro_client_registration_sessions
  WHERE session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF v_session.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'completed', 'customer_id', v_session.customer_id);
  END IF;

  IF now() > v_session.expires_at THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  v_phone := normalize_phone(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide';
  END IF;

  IF trim(COALESCE(p_full_name, '')) = '' THEN
    RAISE EXCEPTION 'Nom requis';
  END IF;

  v_company := NULLIF(trim(p_company_name), '');
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Raison sociale requise';
  END IF;

  v_email := NULLIF(lower(trim(p_email)), '');

  IF EXISTS (SELECT 1 FROM customers WHERE phone = v_phone) THEN
    RAISE EXCEPTION 'Un client avec ce téléphone existe déjà';
  END IF;

  IF v_email IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE email = v_email) THEN
    RAISE EXCEPTION 'Un client avec cet email existe déjà';
  END IF;

  INSERT INTO customers (
    full_name,
    phone,
    email,
    card_number,
    store_id,
    card_variant,
    is_pro_client,
    pro_client_active,
    company_name
  )
  VALUES (
    trim(p_full_name),
    v_phone,
    v_email,
    generate_loyalty_card_number(),
    v_session.store_id,
    'champagne',
    true,
    false,
    v_company
  )
  RETURNING * INTO v_customer;

  UPDATE pro_client_registration_sessions
  SET
    completed_at = now(),
    customer_id = v_customer.id
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'customer_id', v_customer.id,
    'qr_token', v_customer.qr_token,
    'card_number', v_customer.card_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION delete_pro_client_customer(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut supprimer un client pro';
  END IF;

  DELETE FROM customers
  WHERE id = p_customer_id
    AND is_pro_client = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client pro introuvable';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_store_pro_client_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION begin_pro_client_registration(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_pro_client_registration_session(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_pro_client_customer(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
