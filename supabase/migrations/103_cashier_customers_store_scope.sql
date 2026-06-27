-- Clients visibles en caisse : magasin d'inscription OU achat dans ce magasin
-- Lookup POS : tout client actif (scan / téléphone) via RPC sécurisée

CREATE OR REPLACE FUNCTION lookup_customer_for_pos(p_field TEXT, p_value TEXT)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role NOT IN ('cashier', 'manager', 'directeur', 'admin') THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_field = 'phone' THEN
    RETURN QUERY SELECT * FROM customers WHERE phone = p_value LIMIT 1;
  ELSIF p_field = 'card_number' THEN
    RETURN QUERY SELECT * FROM customers WHERE card_number = p_value LIMIT 1;
  ELSIF p_field = 'qr_token' THEN
    RETURN QUERY SELECT * FROM customers WHERE qr_token = p_value LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Champ invalide';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_customer_for_pos(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Cashier read customers" ON customers;
CREATE POLICY "Cashier read customers" ON customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cashier'
        AND p.is_active = true
        AND p.store_id IS NOT NULL
        AND (
          customers.store_id = p.store_id
          OR EXISTS (
            SELECT 1 FROM sales s
            WHERE s.customer_id = customers.id
              AND s.store_id = p.store_id
              AND s.cancelled_at IS NULL
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
