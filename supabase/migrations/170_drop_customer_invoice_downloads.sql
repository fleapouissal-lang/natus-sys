-- Supprime le suivi téléchargements facture Client Pro (original / duplicata)

DROP FUNCTION IF EXISTS record_public_customer_invoice_download(UUID, UUID);

DROP TABLE IF EXISTS customer_invoice_downloads;

CREATE OR REPLACE FUNCTION get_public_customer_invoice(
  p_token UUID,
  p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
BEGIN
  IF p_token IS NULL OR p_sale_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'total', s.total,
    'created_at', s.created_at,
    'payment_method', s.payment_method,
    'loyalty_discount', s.loyalty_discount,
    'pro_client_discount', COALESCE(s.pro_client_discount, 0),
    'promo_discount', s.promo_discount,
    'promo_code', s.promo_code,
    'customer_name', s.customer_name,
    'store_name', st.name,
    'cashier_name', COALESCE(p.full_name, p.email, 'Natus'),
    'cancelled_at', s.cancelled_at,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', pr.name,
            'quantity', si.quantity,
            'unit_price', si.unit_price
          )
          ORDER BY pr.name
        )
        FROM sale_items si
        JOIN products pr ON pr.id = si.product_id
        WHERE si.sale_id = s.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_row
  FROM sales s
  JOIN customers c ON c.id = s.customer_id AND c.qr_token = p_token
  LEFT JOIN stores st ON st.id = s.store_id
  LEFT JOIN profiles p ON p.id = s.cashier_id
  WHERE s.id = p_sale_id
    AND s.invoice_validated_at IS NOT NULL;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_customer_order(
  p_token UUID,
  p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
BEGIN
  IF p_token IS NULL OR p_sale_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'total', s.total,
    'created_at', s.created_at,
    'payment_method', s.payment_method,
    'loyalty_discount', s.loyalty_discount,
    'pro_client_discount', COALESCE(s.pro_client_discount, 0),
    'promo_discount', s.promo_discount,
    'promo_code', s.promo_code,
    'customer_name', s.customer_name,
    'store_name', st.name,
    'cashier_name', COALESCE(p.full_name, p.email, 'Natus'),
    'cancelled_at', s.cancelled_at,
    'invoice_validated_at', s.invoice_validated_at,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', pr.name,
            'quantity', si.quantity,
            'unit_price', si.unit_price
          )
          ORDER BY pr.name
        )
        FROM sale_items si
        JOIN products pr ON pr.id = si.product_id
        WHERE si.sale_id = s.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_row
  FROM sales s
  JOIN customers c ON c.id = s.customer_id AND c.qr_token = p_token
  LEFT JOIN stores st ON st.id = s.store_id
  LEFT JOIN profiles p ON p.id = s.cashier_id
  WHERE s.id = p_sale_id
    AND COALESCE(c.is_pro_client, false) = true
    AND s.invoice_validated_at IS NOT NULL;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_customer_invoice(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_customer_order(UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
