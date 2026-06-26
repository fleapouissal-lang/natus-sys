-- Client Pro : inscription QR temporaire + activation directeur

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_pro_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_client_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_name TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_pro_pending
  ON customers(is_pro_client, pro_client_active)
  WHERE is_pro_client = true AND pro_client_active = false;

CREATE TABLE IF NOT EXISTS pro_client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_client_invites_token ON pro_client_invites(token);
CREATE INDEX IF NOT EXISTS idx_pro_client_invites_expires ON pro_client_invites(expires_at DESC);

CREATE OR REPLACE FUNCTION create_pro_client_invite(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_invite pro_client_invites%ROWTYPE;
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

  INSERT INTO pro_client_invites (store_id, created_by, expires_at)
  VALUES (p_store_id, auth.uid(), now() + interval '15 minutes')
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'token', v_invite.token,
    'expires_at', v_invite.expires_at,
    'store_id', v_invite.store_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION open_pro_client_invite(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite pro_client_invites%ROWTYPE;
  v_store_name TEXT;
BEGIN
  SELECT * INTO v_invite FROM pro_client_invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF v_invite.completed_at IS NOT NULL AND v_invite.customer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'customer_id', v_invite.customer_id
    );
  END IF;

  IF now() > v_invite.expires_at THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_invite.opened_at IS NULL THEN
    UPDATE pro_client_invites
    SET opened_at = now()
    WHERE id = v_invite.id;
    v_invite.opened_at := now();
  END IF;

  SELECT name INTO v_store_name FROM stores WHERE id = v_invite.store_id;

  RETURN jsonb_build_object(
    'status', 'open',
    'expires_at', v_invite.expires_at,
    'opened_at', v_invite.opened_at,
    'store_name', COALESCE(v_store_name, 'Natus')
  );
END;
$$;

CREATE OR REPLACE FUNCTION submit_pro_client_registration(
  p_token UUID,
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
  v_invite pro_client_invites%ROWTYPE;
  v_phone TEXT;
  v_email TEXT;
  v_company TEXT;
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM pro_client_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF v_invite.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'completed', 'customer_id', v_invite.customer_id);
  END IF;

  IF now() > v_invite.expires_at THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_invite.opened_at IS NULL THEN
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
    v_invite.store_id,
    'champagne',
    true,
    false,
    v_company
  )
  RETURNING * INTO v_customer;

  UPDATE pro_client_invites
  SET
    completed_at = now(),
    customer_id = v_customer.id
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'customer_id', v_customer.id,
    'qr_token', v_customer.qr_token,
    'card_number', v_customer.card_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION toggle_pro_client_active(
  p_customer_id UUID,
  p_active BOOLEAN
)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut activer un client pro';
  END IF;

  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND is_pro_client = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client pro introuvable';
  END IF;

  UPDATE customers
  SET
    pro_client_active = p_active,
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

GRANT EXECUTE ON FUNCTION create_pro_client_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION open_pro_client_invite(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_pro_client_registration(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_pro_client_active(UUID, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
