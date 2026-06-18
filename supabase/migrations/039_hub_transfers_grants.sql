-- Droits lecture API pour les transferts hub (RLS seul ne suffit pas)

GRANT SELECT ON public.hub_stock_transfers TO authenticated;
GRANT SELECT ON public.hub_stock_transfer_items TO authenticated;
GRANT ALL ON public.hub_stock_transfers TO service_role;
GRANT ALL ON public.hub_stock_transfer_items TO service_role;

NOTIFY pgrst, 'reload schema';
