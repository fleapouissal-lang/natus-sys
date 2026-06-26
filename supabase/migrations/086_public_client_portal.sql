-- Espace client public par lien carte : pro + factures

DROP FUNCTION IF EXISTS get_public_loyalty_card(UUID);

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
  WHERE c.qr_token = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION get_public_customer_invoices(
  p_token UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_limit INTEGER;
  v_rows JSONB;
BEGIN
  IF p_token IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT c.id INTO v_customer_id FROM customers c WHERE c.qr_token = p_token;
  IF v_customer_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'created_at' DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'total', s.total,
      'created_at', s.created_at,
      'payment_method', s.payment_method,
      'store_name', st.name,
      'cancelled_at', s.cancelled_at
    ) AS row
    FROM sales s
    LEFT JOIN stores st ON st.id = s.store_id
    WHERE s.customer_id = v_customer_id
    ORDER BY s.created_at DESC
    LIMIT v_limit
  ) q;

  RETURN v_rows;
END;
$$;

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
  WHERE s.id = p_sale_id;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_loyalty_card(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_customer_invoices(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_customer_invoice(UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
