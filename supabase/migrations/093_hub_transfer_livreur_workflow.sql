-- Étape 1 : nouveaux statuts transfert hub + colonnes livreur

ALTER TYPE hub_stock_transfer_status ADD VALUE IF NOT EXISTS 'en_cours';
ALTER TYPE hub_stock_transfer_status ADD VALUE IF NOT EXISTS 'pret';
ALTER TYPE hub_stock_transfer_status ADD VALUE IF NOT EXISTS 'en_livraison';

ALTER TABLE hub_stock_transfers
  ADD COLUMN IF NOT EXISTS assigned_livreur_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_hub_stock_transfers_livreur
  ON hub_stock_transfers (assigned_livreur_id, status);

NOTIFY pgrst, 'reload schema';
