-- Programme fidélité : clients, transactions, extension ventes

CREATE SEQUENCE IF NOT EXISTS loyalty_card_number_seq START 1;

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  card_number TEXT NOT NULL UNIQUE,
  loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  apple_wallet_pass_id TEXT,
  google_wallet_pass_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_phone_unique UNIQUE (phone),
  CONSTRAINT customers_email_unique UNIQUE (email)
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_card_number ON customers(card_number);
CREATE INDEX idx_customers_qr_token ON customers(qr_token);
CREATE INDEX idx_customers_store ON customers(store_id);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL CHECK (points > 0),
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX idx_loyalty_tx_sale ON loyalty_transactions(sale_id);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE OR REPLACE FUNCTION generate_loyalty_card_number()
RETURNS TEXT AS $$
DECLARE
  v_num BIGINT;
BEGIN
  v_num := nextval('loyalty_card_number_seq');
  RETURN 'FID-' || LPAD(v_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := regexp_replace(trim(p_phone), '[^0-9+]', '', 'g');
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;
  IF v_clean LIKE '0%' AND length(v_clean) = 10 THEN
    v_clean := '+212' || substring(v_clean from 2);
  ELSIF v_clean LIKE '212%' AND v_clean NOT LIKE '+%' THEN
    v_clean := '+' || v_clean;
  ELSIF v_clean NOT LIKE '+%' AND length(v_clean) = 9 THEN
    v_clean := '+212' || v_clean;
  END IF;
  RETURN v_clean;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION create_loyalty_customer(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_store_id UUID DEFAULT NULL
)
RETURNS customers AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_store_id UUID;
  v_phone TEXT;
  v_email TEXT;
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

  INSERT INTO customers (full_name, phone, email, card_number, store_id)
  VALUES (trim(p_full_name), v_phone, v_email, generate_loyalty_card_number(), v_store_id)
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION get_loyalty_customer_by_qr_token(p_token UUID)
RETURNS customers AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE qr_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carte introuvable';
  END IF;
  RETURN v_customer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT SELECT ON customers TO authenticated;
GRANT SELECT ON loyalty_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION create_loyalty_customer(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_loyalty_customer_by_qr_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION normalize_phone(TEXT) TO authenticated;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Director read all customers" ON customers
  FOR SELECT TO authenticated
  USING (is_director());

CREATE POLICY "Manager read city customers" ON customers
  FOR SELECT TO authenticated
  USING (
    is_manager()
    AND (
      store_id IS NULL
      OR store_in_management_city(store_id)
    )
  );

CREATE POLICY "Cashier read customers" ON customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
    )
  );

CREATE POLICY "Director read loyalty transactions" ON loyalty_transactions
  FOR SELECT TO authenticated
  USING (is_director());

CREATE POLICY "Manager read city loyalty transactions" ON loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    is_manager()
    AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_transactions.customer_id
        AND (c.store_id IS NULL OR store_in_management_city(c.store_id))
    )
  );

CREATE POLICY "Cashier read loyalty transactions" ON loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
