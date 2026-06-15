-- La policy 022 joignait stores dans une policy ON stores → récursion infinie.
-- Les cibles de transfert sont chargées côté serveur (service role).

DROP POLICY IF EXISTS "Cashier read order transfer stores" ON stores;

NOTIFY pgrst, 'reload schema';
