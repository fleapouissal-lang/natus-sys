-- Directeur : modifier le client sur une facture avant validation.

CREATE OR REPLACE FUNCTION update_sale_invoice_customer(
  p_sale_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := COALESCE(NULLIF(trim(p_customer_name), ''), 'Divers');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut modifier le client de la facture';
  END IF;

  UPDATE sales
  SET
    customer_name = v_name,
    customer_phone = NULLIF(trim(p_customer_phone), '')
  WHERE id = p_sale_id
    AND cancelled_at IS NULL
    AND invoice_validated_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable, déjà validée ou annulée';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_sale_invoice_customer(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
