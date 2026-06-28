-- Produits de fabrication (matières premières / composants) — séparés du catalogue POS

CREATE TABLE IF NOT EXISTS fabrication_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_code TEXT,
  unit TEXT NOT NULL DEFAULT 'unité',
  category TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fabrication_products_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fabrication_products_code
  ON fabrication_products (product_code)
  WHERE product_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fabrication_products_active_name
  ON fabrication_products (is_active, name);

CREATE TABLE IF NOT EXISTS fabrication_inventory (
  hub_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  fabrication_product_id UUID NOT NULL REFERENCES fabrication_products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hub_store_id, fabrication_product_id)
);

CREATE INDEX IF NOT EXISTS idx_fabrication_inventory_product
  ON fabrication_inventory (fabrication_product_id);

CREATE OR REPLACE FUNCTION fabrication_hub_store_valid(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = p_store_id
      AND s.is_active = true
      AND s.is_hub = true
  );
$$;

CREATE OR REPLACE FUNCTION can_access_fabrication_products()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_director() OR is_hub_operator();
$$;

ALTER TABLE fabrication_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrication_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY fabrication_products_select ON fabrication_products
  FOR SELECT TO authenticated
  USING (can_access_fabrication_products());

CREATE POLICY fabrication_products_insert ON fabrication_products
  FOR INSERT TO authenticated
  WITH CHECK (is_director());

CREATE POLICY fabrication_products_update ON fabrication_products
  FOR UPDATE TO authenticated
  USING (is_director())
  WITH CHECK (is_director());

CREATE POLICY fabrication_products_delete ON fabrication_products
  FOR DELETE TO authenticated
  USING (is_director());

CREATE POLICY fabrication_inventory_select ON fabrication_inventory
  FOR SELECT TO authenticated
  USING (
    is_director()
    OR (is_hub_operator() AND store_in_hub_city(hub_store_id))
  );

CREATE POLICY fabrication_inventory_insert ON fabrication_inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    fabrication_hub_store_valid(hub_store_id)
    AND (
      is_director()
      OR (is_hub_operator() AND store_in_hub_city(hub_store_id))
    )
  );

CREATE POLICY fabrication_inventory_update ON fabrication_inventory
  FOR UPDATE TO authenticated
  USING (
    is_director()
    OR (is_hub_operator() AND store_in_hub_city(hub_store_id))
  )
  WITH CHECK (
    fabrication_hub_store_valid(hub_store_id)
    AND (
      is_director()
      OR (is_hub_operator() AND store_in_hub_city(hub_store_id))
    )
  );

CREATE POLICY fabrication_inventory_delete ON fabrication_inventory
  FOR DELETE TO authenticated
  USING (
    is_director()
    OR (is_hub_operator() AND store_in_hub_city(hub_store_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON fabrication_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fabrication_inventory TO authenticated;

-- Seed : matières de fabrication + stock dépôt par ville active
INSERT INTO fabrication_products (name, product_code, unit, category, description)
SELECT v.name, v.product_code, v.unit, v.category, v.description
FROM (
  VALUES
    ('Base crème neutre', 'FAB-BASE-001', 'kg', 'Base', 'Base émulsion pour crèmes visage et corps'),
    ('Huile d''argan', 'FAB-HUILE-002', 'L', 'Huile', 'Huile végétale pour soins'),
    ('Beurre de karité', 'FAB-BEUR-003', 'kg', 'Beurre', 'Beurre végétal pour baumes'),
    ('Concentré parfum vanille', 'FAB-PARF-004', 'L', 'Parfum', 'Parfum pour finition produits'),
    ('Pot vide 50 ml', 'FAB-POT-050', 'unité', 'Emballage', 'Contenant PET 50 ml'),
    ('Pot vide 100 ml', 'FAB-POT-100', 'unité', 'Emballage', 'Contenant PET 100 ml'),
    ('Étiquette standard', 'FAB-ETIQ-001', 'unité', 'Emballage', 'Étiquette logo Natus'),
    ('Carton d''emballage', 'FAB-CART-001', 'unité', 'Emballage', 'Carton expédition unitaire'),
    ('Cire émulsifiante', 'FAB-CIRE-005', 'kg', 'Base', 'Agent émulsifiant'),
    ('Glycérine végétale', 'FAB-GLYC-006', 'L', 'Base', 'Humectant')
) AS v(name, product_code, unit, category, description)
WHERE NOT EXISTS (
  SELECT 1 FROM fabrication_products fp WHERE fp.product_code = v.product_code
);

INSERT INTO fabrication_inventory (hub_store_id, fabrication_product_id, stock)
SELECT
  h.id,
  fp.id,
  CASE fp.product_code
    WHEN 'FAB-BASE-001' THEN CASE WHEN h.city = 'Marrakech' THEN 120 ELSE 95 END
    WHEN 'FAB-HUILE-002' THEN CASE WHEN h.city = 'Marrakech' THEN 45 ELSE 38 END
    WHEN 'FAB-BEUR-003' THEN CASE WHEN h.city = 'Marrakech' THEN 60 ELSE 52 END
    WHEN 'FAB-PARF-004' THEN 18
    WHEN 'FAB-POT-050' THEN CASE WHEN h.city = 'Marrakech' THEN 2500 ELSE 2100 END
    WHEN 'FAB-POT-100' THEN CASE WHEN h.city = 'Marrakech' THEN 1800 ELSE 1500 END
    WHEN 'FAB-ETIQ-001' THEN CASE WHEN h.city = 'Marrakech' THEN 5000 ELSE 4200 END
    WHEN 'FAB-CART-001' THEN CASE WHEN h.city = 'Marrakech' THEN 800 ELSE 650 END
    WHEN 'FAB-CIRE-005' THEN 35
    WHEN 'FAB-GLYC-006' THEN 28
    ELSE 0
  END
FROM stores h
CROSS JOIN fabrication_products fp
WHERE h.is_active = true
  AND h.is_hub = true
  AND fp.product_code IN (
    'FAB-BASE-001', 'FAB-HUILE-002', 'FAB-BEUR-003', 'FAB-PARF-004', 'FAB-POT-050',
    'FAB-POT-100', 'FAB-ETIQ-001', 'FAB-CART-001', 'FAB-CIRE-005', 'FAB-GLYC-006'
  )
ON CONFLICT (hub_store_id, fabrication_product_id) DO UPDATE
SET stock = EXCLUDED.stock,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
