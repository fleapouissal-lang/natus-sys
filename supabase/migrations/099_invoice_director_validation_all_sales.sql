-- Toutes les factures (caisse + Shopify) passent par validation directeur.

DROP TRIGGER IF EXISTS sales_invoice_validation_default ON sales;
DROP FUNCTION IF EXISTS sales_invoice_validation_default();

NOTIFY pgrst, 'reload schema';
