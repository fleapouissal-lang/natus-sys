-- Auto-refresh temps réel : publier les tables opérationnelles principales dans
-- la publication realtime, afin que toute modification en base déclenche un
-- rafraîchissement automatique de la page (sans rechargement manuel).
--
-- Déjà publiées (migrations 027 / 054) : shopify_orders, store_inventory,
-- hub_stock_transfers. On ajoute ici les tables manquantes.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'store_stock_transfers',
    'sales',
    'sale_cheques',
    'store_day_closures',
    'store_complaints',
    'store_product_writeoffs',
    'store_planning_cashiers'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- REPLICA IDENTITY FULL : permet d'avoir l'ancienne ligne dans le payload
    -- et un filtrage RLS correct sur les UPDATE/DELETE.
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);

    -- Ajout à la publication realtime (idempotent).
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
