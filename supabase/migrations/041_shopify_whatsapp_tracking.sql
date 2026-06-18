-- Suivi commande Shopify + confirmation client WhatsApp + fidélité

ALTER TABLE shopify_orders
  ADD COLUMN IF NOT EXISTS tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopify_orders_tracking_token
  ON shopify_orders(tracking_token);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_confirmed
  ON shopify_orders(customer_confirmed_at)
  WHERE customer_confirmed_at IS NOT NULL;

ALTER TABLE loyalty_transactions
  ADD COLUMN IF NOT EXISTS shopify_order_id UUID REFERENCES shopify_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_shopify_order
  ON loyalty_transactions(shopify_order_id);

-- Lecture publique (sans login) pour page suivi
CREATE OR REPLACE FUNCTION get_public_shopify_order(p_token UUID)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_name TEXT,
  workflow_status TEXT,
  payment_type TEXT,
  total NUMERIC,
  currency TEXT,
  line_items JSONB,
  customer_confirmed_at TIMESTAMPTZ,
  shipping_address TEXT,
  city TEXT,
  loyalty_points_earned INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.workflow_status,
    o.payment_type,
    o.total,
    o.currency,
    o.line_items,
    o.customer_confirmed_at,
    o.shipping_address,
    o.city,
    o.loyalty_points_earned,
    o.created_at,
    o.updated_at
  FROM shopify_orders o
  WHERE o.tracking_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_public_shopify_order(UUID) TO anon, authenticated;

-- Confirmation client (webhook WhatsApp) + fidélité
CREATE OR REPLACE FUNCTION confirm_shopify_order_customer(p_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_order shopify_orders%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_phone TEXT;
  v_points INTEGER;
  v_points_per_mad NUMERIC;
  v_created BOOLEAN := false;
BEGIN
  SELECT * INTO v_order
  FROM shopify_orders
  WHERE tracking_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.customer_confirmed_at IS NOT NULL THEN
    SELECT * INTO v_customer FROM customers WHERE id = v_order.customer_id;
    RETURN jsonb_build_object(
      'already_confirmed', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'tracking_token', v_order.tracking_token,
      'customer_name', v_order.customer_name,
      'points_earned', v_order.loyalty_points_earned,
      'loyalty_points', COALESCE(v_customer.loyalty_points, 0),
      'qr_token', v_customer.qr_token,
      'created_new_card', false
    );
  END IF;

  v_phone := normalize_phone(v_order.customer_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Téléphone client invalide';
  END IF;

  SELECT * INTO v_customer FROM customers WHERE phone = v_phone;

  IF NOT FOUND THEN
    INSERT INTO customers (full_name, phone, card_number, store_id, card_variant)
    VALUES (
      COALESCE(NULLIF(trim(v_order.customer_name), ''), 'Client Natus'),
      v_phone,
      generate_loyalty_card_number(),
      v_order.store_id,
      'champagne'
    )
    RETURNING * INTO v_customer;
    v_created := true;
  END IF;

  SELECT ls.points_per_mad INTO v_points_per_mad FROM loyalty_settings ls WHERE ls.id = 1;
  IF v_points_per_mad IS NULL OR v_points_per_mad <= 0 THEN
    v_points_per_mad := 10;
  END IF;

  v_points := GREATEST(FLOOR(v_order.total / v_points_per_mad)::INTEGER, 0);

  IF v_points > 0 THEN
    UPDATE customers
    SET
      loyalty_points = loyalty_points + v_points,
      updated_at = NOW()
    WHERE id = v_customer.id
    RETURNING * INTO v_customer;

    INSERT INTO loyalty_transactions (
      customer_id,
      shopify_order_id,
      type,
      points,
      description
    )
    VALUES (
      v_customer.id,
      v_order.id,
      'earn',
      v_points,
      'Gain fidélité — commande Shopify ' || v_order.order_number
    );
  END IF;

  UPDATE shopify_orders
  SET
    customer_confirmed_at = NOW(),
    customer_id = v_customer.id,
    loyalty_points_earned = v_points,
    updated_at = NOW()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'already_confirmed', false,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'tracking_token', v_order.tracking_token,
    'customer_name', v_customer.full_name,
    'points_earned', v_points,
    'loyalty_points', v_customer.loyalty_points,
    'qr_token', v_customer.qr_token,
    'created_new_card', v_created
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION confirm_shopify_order_customer(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
