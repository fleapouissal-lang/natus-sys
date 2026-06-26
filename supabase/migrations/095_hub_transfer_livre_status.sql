-- Statut « livré » : le livreur signale la livraison, le caissier valide ensuite.

ALTER TYPE hub_stock_transfer_status ADD VALUE IF NOT EXISTS 'livre';

ALTER TABLE hub_stock_transfers
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES profiles(id);

NOTIFY pgrst, 'reload schema';
