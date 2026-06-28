-- Client Pro particulier : historique de toutes les ventes (portail public)

CREATE OR REPLACE FUNCTION get_public_customer_orders(
  p_token UUID,
  p_limit INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_limit INTEGER;
  v_rows JSONB;
BEGIN
  IF p_token IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_customer FROM customers c WHERE c.qr_token = p_token;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT COALESCE(v_customer.is_pro_client, false)
     OR COALESCE(v_customer.pro_client_type, '') <> 'particulier' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'created_at' DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'total', s.total,
      'created_at', s.created_at,
      'payment_method', s.payment_method,
      'store_name', st.name,
      'cancelled_at', s.cancelled_at,
      'invoice_validated_at', s.invoice_validated_at,
      'pro_client_discount', COALESCE(s.pro_client_discount, 0)
    ) AS row
    FROM sales s
    LEFT JOIN stores st ON st.id = s.store_id
    WHERE s.customer_id = v_customer.id
    ORDER BY s.created_at DESC
    LIMIT v_limit
  ) q;

  RETURN v_rows;
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
    AND COALESCE(c.pro_client_type, '') = 'particulier';

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_customer_orders(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_customer_order(UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
