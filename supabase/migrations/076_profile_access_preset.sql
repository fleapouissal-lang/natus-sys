-- Profils à accès limité (gérant magasin, compte magasin caisse)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_preset TEXT NOT NULL DEFAULT 'full';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_access_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_access_preset_check
  CHECK (access_preset IN ('full', 'store_planning_stock', 'store_planning_pos_sales'));

NOTIFY pgrst, 'reload schema';
