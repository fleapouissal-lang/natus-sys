-- Transfert commandes : pas de policy RLS sur stores (évite récursion).
-- Les magasins cibles sont chargés côté serveur via service role.

DROP POLICY IF EXISTS "Cashier read order transfer stores" ON stores;

NOTIFY pgrst, 'reload schema';
