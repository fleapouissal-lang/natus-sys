-- Partie 1 : ajouter la valeur enum (doit être dans sa propre migration)
-- PostgreSQL interdit d'utiliser 'directeur' dans la même transaction.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'directeur';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Gérant existant → Marrakech (ville des magasins démo)
UPDATE profiles SET city = 'Marrakech' WHERE role = 'manager' AND city IS NULL;

-- Magasin démo Casablanca (multi-ville)
INSERT INTO stores (name, city, address)
SELECT 'Natus Casablanca Anfa', 'Casablanca', 'Boulevard de la Corniche, Anfa'
WHERE NOT EXISTS (
  SELECT 1 FROM stores WHERE name = 'Natus Casablanca Anfa'
);

-- Inventaire initial pour le nouveau magasin
INSERT INTO store_inventory (store_id, product_id, stock)
SELECT s.id, p.id, GREATEST(FLOOR(p.stock * 0.5)::INTEGER, 5)
FROM stores s
CROSS JOIN products p
WHERE s.name = 'Natus Casablanca Anfa'
ON CONFLICT (store_id, product_id) DO NOTHING;
