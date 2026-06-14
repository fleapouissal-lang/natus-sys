-- PostgREST : exposer shopify_orders à l'API (plus d'auto-expose par défaut sur Supabase)

GRANT SELECT ON public.shopify_orders TO authenticated;
GRANT ALL ON public.shopify_orders TO service_role;

-- Recharge le cache schéma PostgREST
NOTIFY pgrst, 'reload schema';
