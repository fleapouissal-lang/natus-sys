-- Caisse magasin : lire les profils collègues du même magasin (nom sur ventes)

DROP POLICY IF EXISTS "Cashiers read store team profiles" ON profiles;
CREATE POLICY "Cashiers read store team profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    user_assigned_store_id() IS NOT NULL
    AND store_id = user_assigned_store_id()
  );

NOTIFY pgrst, 'reload schema';
