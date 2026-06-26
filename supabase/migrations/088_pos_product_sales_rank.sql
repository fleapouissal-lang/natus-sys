-- Quantités vendues par produit (caisse) pour tri catalogue POS

CREATE OR REPLACE FUNCTION get_store_product_sales_qty(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_store_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(product_id::text, total_qty),
    '{}'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      si.product_id,
      SUM(si.quantity)::bigint AS total_qty
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE s.store_id = p_store_id
      AND s.cancelled_at IS NULL
    GROUP BY si.product_id
  ) ranked;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_store_product_sales_qty(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
