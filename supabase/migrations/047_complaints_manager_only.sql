-- Réclamations : réservées aux gérants (manager) et direction, pas aux caissiers

DROP POLICY IF EXISTS store_complaints_select_cashier ON store_complaints;
DROP POLICY IF EXISTS store_complaints_update_cashier ON store_complaints;

NOTIFY pgrst, 'reload schema';
