-- Factures caisse : en attente de validation directeur avant visibilité magasin.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_validated_at ON sales(invoice_validated_at);

-- Historique existant : considéré comme déjà validé.
UPDATE sales
SET invoice_validated_at = created_at
WHERE invoice_validated_at IS NULL;

-- Commandes Shopify : validation automatique à la création.
CREATE OR REPLACE FUNCTION sales_invoice_validation_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_validated_at IS NULL AND NEW.shopify_order_id IS NOT NULL THEN
    NEW.invoice_validated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_invoice_validation_default ON sales;
CREATE TRIGGER sales_invoice_validation_default
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoice_validation_default();

CREATE OR REPLACE FUNCTION validate_sale_invoice(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut valider une facture';
  END IF;

  UPDATE sales
  SET
    invoice_validated_at = now(),
    invoice_validated_by = auth.uid()
  WHERE id = p_sale_id
    AND cancelled_at IS NULL
    AND invoice_validated_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable, déjà validée ou annulée';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_sale_invoice(UUID) TO authenticated;

-- Portail client : factures visibles seulement après validation directeur.
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
      AND s.invoice_validated_at IS NOT NULL
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
  WHERE s.id = p_sale_id
    AND s.invoice_validated_at IS NOT NULL;

  RETURN v_row;
END;
$$;

NOTIFY pgrst, 'reload schema';
