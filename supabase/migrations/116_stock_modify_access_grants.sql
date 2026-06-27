-- Exposer les tables d'accès stock à l'API Supabase (PostgREST)

GRANT SELECT, INSERT, UPDATE ON stock_modify_access_requests TO authenticated;
GRANT SELECT, INSERT ON stock_modify_access_request_stores TO authenticated;
GRANT ALL ON stock_modify_access_requests TO service_role;
GRANT ALL ON stock_modify_access_request_stores TO service_role;

NOTIFY pgrst, 'reload schema';
