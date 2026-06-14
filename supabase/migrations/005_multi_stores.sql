-- Multi-magasins : stock par magasin

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Marrakech',
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store_inventory (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, product_id)
);

CREATE INDEX idx_store_inventory_store ON store_inventory(store_id);
CREATE INDEX idx_store_inventory_product ON store_inventory(product_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Magasins de démonstration
INSERT INTO stores (name, city, address) VALUES
  ('Natus Guéliz', 'Marrakech', 'Avenue Mohammed V, Guéliz'),
  ('Natus Médina', 'Marrakech', 'Souk Semmarine, Médina');

-- Migrer le stock existant vers le premier magasin
INSERT INTO store_inventory (store_id, product_id, stock)
SELECT (SELECT id FROM stores ORDER BY created_at LIMIT 1), id, stock
FROM products
ON CONFLICT (store_id, product_id) DO UPDATE SET stock = EXCLUDED.stock;

-- Stock initial réduit pour le 2e magasin (démo)
INSERT INTO store_inventory (store_id, product_id, stock)
SELECT
  (SELECT id FROM stores ORDER BY created_at OFFSET 1 LIMIT 1),
  p.id,
  GREATEST(FLOOR(p.stock * 0.6)::INTEGER, 3)
FROM products p
ON CONFLICT (store_id, product_id) DO NOTHING;

-- Synchroniser products.stock = somme des magasins
CREATE OR REPLACE FUNCTION sync_product_stock_from_stores()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products SET stock = COALESCE((
    SELECT SUM(si.stock) FROM store_inventory si WHERE si.product_id = v_product_id
  ), 0), updated_at = NOW()
  WHERE id = v_product_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_inventory_sync_product_stock
AFTER INSERT OR UPDATE OR DELETE ON store_inventory
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_from_stores();

UPDATE products p SET stock = COALESCE((
  SELECT SUM(si.stock) FROM store_inventory si WHERE si.product_id = p.id
), 0);

-- Nouveau produit → lignes d'inventaire pour chaque magasin actif
CREATE OR REPLACE FUNCTION init_store_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO store_inventory (store_id, product_id, stock)
  SELECT s.id, NEW.id, 0 FROM stores s WHERE s.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_init_inventory
AFTER INSERT ON products
FOR EACH ROW EXECUTE FUNCTION init_store_inventory_for_product();

CREATE TRIGGER store_inventory_updated_at BEFORE UPDATE ON store_inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vente : déduire du stock du magasin du caissier
CREATE OR REPLACE FUNCTION complete_sale(
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
  v_store_id UUID;
  v_store_stock INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  SELECT store_id INTO v_store_id FROM profiles WHERE id = auth.uid();

  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id FROM stores WHERE is_active = true ORDER BY created_at LIMIT 1;
  END IF;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Aucun magasin configuré';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT stock INTO v_store_stock
    FROM store_inventory
    WHERE store_id = v_store_id AND product_id = v_product.id
    FOR UPDATE;

    IF NOT FOUND OR v_store_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour % dans ce magasin', v_product.name;
    END IF;

    v_total := v_total + v_product.price * v_qty;
  END LOOP;

  INSERT INTO sales (cashier_id, total, payment_method, store_id)
  VALUES (auth.uid(), v_total, p_payment_method, v_store_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price);

    UPDATE store_inventory
    SET stock = stock - v_qty
    WHERE store_id = v_store_id AND product_id = v_product.id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, store_id)
    VALUES (v_product.id, -v_qty, 'sale', 'Vente ' || v_sale_id, auth.uid(), v_store_id);
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS magasins et inventaire
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stores" ON stores
  FOR SELECT TO authenticated USING (is_active = true OR is_manager());

CREATE POLICY "Managers can manage stores" ON stores
  FOR ALL USING (is_manager()) WITH CHECK (is_manager());

CREATE POLICY "Authenticated can read store inventory" ON store_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage store inventory" ON store_inventory
  FOR ALL USING (is_manager()) WITH CHECK (is_manager());
