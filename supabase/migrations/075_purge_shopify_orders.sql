-- Purge unique des commandes Shopify (démo / données existantes).
-- Conserve la table shopify_orders et le catalogue produits.

DO $$
DECLARE
  v_sale_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT sale_id)
  INTO v_sale_ids
  FROM (
    SELECT o.sale_id
    FROM shopify_orders o
    WHERE o.sale_id IS NOT NULL
    UNION
    SELECT s.id
    FROM sales s
    WHERE s.shopify_order_id IS NOT NULL
  ) linked_sales;

  IF v_sale_ids IS NOT NULL THEN
    UPDATE winback_promo_codes
    SET used_at = NULL, sale_id = NULL
    WHERE sale_id = ANY(v_sale_ids);

    DELETE FROM sale_items WHERE sale_id = ANY(v_sale_ids);
    DELETE FROM sales WHERE id = ANY(v_sale_ids);
  END IF;

  DELETE FROM customer_notes WHERE shopify_order_id IS NOT NULL;
  DELETE FROM shopify_orders;
END $$;

NOTIFY pgrst, 'reload schema';
