-- 3e modèle de carte fidélité : crème / bandeau doré

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_card_variant_check;

ALTER TABLE customers
  ADD CONSTRAINT customers_card_variant_check
  CHECK (card_variant IN ('champagne', 'noir', 'creme'));

CREATE OR REPLACE FUNCTION create_loyalty_customer(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_card_variant TEXT DEFAULT 'champagne'
)
RETURNS customers AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_store_id UUID;
  v_phone TEXT;
  v_email TEXT;
  v_variant TEXT;
  v_customer customers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid() AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  IF v_profile.role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_phone := normalize_phone(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide';
  END IF;

  IF trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Nom requis';
  END IF;

  v_email := NULLIF(lower(trim(p_email)), '');
  v_variant := COALESCE(NULLIF(lower(trim(p_card_variant)), ''), 'champagne');

  IF v_variant NOT IN ('champagne', 'noir', 'creme') THEN
    RAISE EXCEPTION 'Modèle de carte invalide';
  END IF;

  IF p_store_id IS NOT NULL AND (is_director() OR is_manager()) THEN
    IF NOT can_access_store(p_store_id) THEN
      RAISE EXCEPTION 'Accès magasin refusé';
    END IF;
    v_store_id := p_store_id;
  ELSE
    v_store_id := v_profile.store_id;
  END IF;

  IF EXISTS (SELECT 1 FROM customers WHERE phone = v_phone) THEN
    RAISE EXCEPTION 'Un client avec ce téléphone existe déjà';
  END IF;

  IF v_email IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE email = v_email) THEN
    RAISE EXCEPTION 'Un client avec cet email existe déjà';
  END IF;

  INSERT INTO customers (full_name, phone, email, card_number, store_id, card_variant)
  VALUES (trim(p_full_name), v_phone, v_email, generate_loyalty_card_number(), v_store_id, v_variant)
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
