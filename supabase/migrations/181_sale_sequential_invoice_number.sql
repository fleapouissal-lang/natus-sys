-- Numero de facture sequentiel global, attribue a la validation.
-- Continue a partir de la derniere facture validee (pas de remise a zero).

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_number BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_number
  ON sales(invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS sale_invoice_number_seq;

-- Backfill : factures deja validees numerotees par ordre de validation.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY invoice_validated_at ASC, created_at ASC, id ASC
    ) AS rn
  FROM sales
  WHERE invoice_validated_at IS NOT NULL
    AND invoice_number IS NULL
)
UPDATE sales s
SET invoice_number = o.rn
FROM ordered o
WHERE s.id = o.id;

-- Positionne la sequence apres le dernier numero attribue.
DO $$
DECLARE
  v_max BIGINT;
BEGIN
  SELECT COALESCE(MAX(invoice_number), 0) INTO v_max FROM sales;
  IF v_max > 0 THEN
    PERFORM setval('sale_invoice_number_seq', v_max, true);
  ELSE
    PERFORM setval('sale_invoice_number_seq', 1, false);
  END IF;
END $$;

-- Trigger unique : auto-validation Shopify a la creation + attribution du numero
-- des qu'une facture passe a l'etat valide (insertion ou validation directeur).
CREATE OR REPLACE FUNCTION sales_invoice_number_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.invoice_validated_at IS NULL
     AND NEW.shopify_order_id IS NOT NULL THEN
    NEW.invoice_validated_at := now();
  END IF;

  IF NEW.invoice_validated_at IS NOT NULL AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := nextval('sale_invoice_number_seq');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_invoice_validation_default ON sales;
DROP TRIGGER IF EXISTS sales_invoice_number_assign_ins ON sales;
DROP TRIGGER IF EXISTS sales_invoice_number_assign_upd ON sales;

CREATE TRIGGER sales_invoice_number_assign_ins
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoice_number_assign();

CREATE TRIGGER sales_invoice_number_assign_upd
  BEFORE UPDATE OF invoice_validated_at ON sales
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoice_number_assign();

NOTIFY pgrst, 'reload schema';
