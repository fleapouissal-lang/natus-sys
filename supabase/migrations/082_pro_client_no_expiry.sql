-- Client Pro : inscription permanente sans expiration de session

CREATE OR REPLACE FUNCTION get_pro_client_registration_store(p_store_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
BEGIN
  SELECT * INTO v_store
  FROM stores
  WHERE pro_client_token = p_store_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  RETURN jsonb_build_object(
    'status', 'open',
    'store_name', v_store.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION submit_pro_client_registration_by_store(
  p_store_token UUID,
  p_client_type TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
  v_type TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_company TEXT;
  v_city TEXT;
  v_address TEXT;
  v_full_name TEXT;
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_store
  FROM stores
  WHERE pro_client_token = p_store_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  v_type := lower(trim(COALESCE(p_client_type, '')));
  IF v_type NOT IN ('entreprise', 'particulier') THEN
    RAISE EXCEPTION 'Type de client invalide';
  END IF;

  v_company := NULLIF(trim(p_company_name), '');
  v_city := NULLIF(trim(p_city), '');
  v_address := NULLIF(trim(p_address), '');
  v_full_name := NULLIF(trim(p_full_name), '');
  v_email := NULLIF(lower(trim(p_email)), '');

  IF v_type = 'entreprise' THEN
    IF v_company IS NULL THEN
      RAISE EXCEPTION 'Nom de l''entreprise requis';
    END IF;
    IF v_city IS NULL THEN
      RAISE EXCEPTION 'Ville requise';
    END IF;
    IF v_full_name IS NULL THEN
      RAISE EXCEPTION 'Nom complet requis';
    END IF;
    IF v_address IS NULL THEN
      RAISE EXCEPTION 'Adresse requise';
    END IF;
  END IF;

  IF v_type = 'particulier' AND v_full_name IS NULL THEN
    IF v_email IS NOT NULL AND position('@' IN v_email) > 1 THEN
      v_full_name := initcap(split_part(v_email, '@', 1));
    ELSE
      v_full_name := 'Client particulier';
    END IF;
  END IF;

  v_phone := normalize_phone(p_phone);
  IF v_phone IS NULL THEN
    v_phone := generate_pro_client_placeholder_phone();
  END IF;

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
    pro_client_type,
    company_name,
    city,
    address
  )
  VALUES (
    v_full_name,
    v_phone,
    v_email,
    generate_loyalty_card_number(),
    v_store.id,
    'champagne',
    true,
    false,
    v_type,
    CASE WHEN v_type = 'entreprise' THEN v_company ELSE NULL END,
    v_city,
    v_address
  )
  RETURNING * INTO v_customer;

  RETURN jsonb_build_object(
    'status', 'success',
    'customer_id', v_customer.id,
    'qr_token', v_customer.qr_token,
    'card_number', v_customer.card_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_pro_client_registration_store(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_pro_client_registration_by_store(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
