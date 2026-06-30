-- Clients Pro : gérant + directeur (consultation globale, activation), pas de suppression.

DROP POLICY IF EXISTS "Manager read city customers" ON customers;
CREATE POLICY "Manager read city customers" ON customers
  FOR SELECT TO authenticated
  USING (
    is_manager()
    AND (
      is_pro_client = true
      OR store_id IS NULL
      OR store_in_management_city(store_id)
    )
  );

DROP POLICY IF EXISTS "Manager read city loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Manager read city loyalty transactions" ON loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    is_manager()
    AND EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_transactions.customer_id
        AND (
          c.is_pro_client = true
          OR c.store_id IS NULL
          OR store_in_management_city(c.store_id)
        )
    )
  );

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
  IF NOT is_director_or_admin() AND NOT is_manager() THEN
    RAISE EXCEPTION 'Seuls le directeur et le gérant peuvent activer un client pro';
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

CREATE OR REPLACE FUNCTION delete_pro_client_customer(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Suppression définitive des clients pro désactivée';
END;
$$;

NOTIFY pgrst, 'reload schema';
