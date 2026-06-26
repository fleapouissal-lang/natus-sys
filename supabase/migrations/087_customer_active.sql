-- Activation / désactivation et suppression des clients fidélité (non pro)

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_customers_inactive
  ON customers(is_active)
  WHERE is_active = false;

CREATE OR REPLACE FUNCTION toggle_loyalty_customer_active(
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
    RAISE EXCEPTION 'Seul le directeur peut modifier un client fidélité';
  END IF;

  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND is_pro_client = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client fidélité introuvable';
  END IF;

  UPDATE customers
  SET
    is_active = p_active,
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

CREATE OR REPLACE FUNCTION delete_loyalty_customer(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut supprimer un client fidélité';
  END IF;

  DELETE FROM customers
  WHERE id = p_customer_id
    AND is_pro_client = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client fidélité introuvable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_loyalty_card(p_token UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  card_number TEXT,
  loyalty_points INTEGER,
  card_variant TEXT,
  qr_token UUID,
  created_at TIMESTAMPTZ,
  is_pro_client BOOLEAN,
  pro_client_active BOOLEAN,
  pro_client_type TEXT,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.card_number,
    c.loyalty_points,
    COALESCE(c.card_variant, 'champagne'),
    c.qr_token,
    c.created_at,
    COALESCE(c.is_pro_client, false),
    COALESCE(c.pro_client_active, false),
    c.pro_client_type,
    c.company_name
  FROM customers c
  WHERE c.qr_token = p_token
    AND c.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_loyalty_customer_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_loyalty_customer(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
