-- Natus POS - Schema initial
-- Exécuter ce script dans l'éditeur SQL Supabase

CREATE TYPE user_role AS ENUM ('manager', 'cashier');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'sale', 'adjustment')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger: créer profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction: finaliser une vente (transaction atomique)
CREATE OR REPLACE FUNCTION complete_sale(
  p_items JSONB
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(10,2) := 0;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_qty INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Utilisateur inactif';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', v_product.name;
    END IF;
    v_total := v_total + v_product.price * v_qty;
  END LOOP;

  INSERT INTO sales (cashier_id, total) VALUES (auth.uid(), v_total) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    v_qty := (v_item->>'quantity')::INTEGER;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty WHERE id = v_product.id;

    INSERT INTO stock_movements (product_id, quantity, type, notes, created_by)
    VALUES (v_product.id, -v_qty, 'sale', 'Vente ' || v_sale_id, auth.uid());
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Managers can read all profiles" ON profiles FOR SELECT USING (is_manager());
CREATE POLICY "Managers can update profiles" ON profiles FOR UPDATE USING (is_manager());

-- Products
CREATE POLICY "Authenticated can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert products" ON products FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update products" ON products FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete products" ON products FOR DELETE USING (is_manager());

-- Sales
CREATE POLICY "Cashiers can read own sales" ON sales FOR SELECT USING (auth.uid() = cashier_id);
CREATE POLICY "Managers can read all sales" ON sales FOR SELECT USING (is_manager());
CREATE POLICY "Authenticated can create sales via RPC" ON sales FOR INSERT WITH CHECK (auth.uid() = cashier_id);

-- Sale items
CREATE POLICY "Read sale items via sale access" ON sale_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR is_manager()))
);

-- Stock movements
CREATE POLICY "Managers can read stock movements" ON stock_movements FOR SELECT USING (is_manager());
CREATE POLICY "Managers can insert stock movements" ON stock_movements FOR INSERT WITH CHECK (is_manager());

-- Données de démonstration (optionnel)
INSERT INTO products (name, barcode, description, price, stock, category, brand) VALUES
  ('Crème hydratante visage', '340001000001', 'Crème hydratante 50ml', 29.90, 50, 'Soin visage', 'Natus Beauty'),
  ('Sérum vitamine C', '340001000002', 'Sérum éclat 30ml', 45.00, 30, 'Soin visage', 'Natus Beauty'),
  ('Rouge à lèvres mat', '340001000003', 'Rouge longue tenue', 22.50, 40, 'Maquillage', 'Natus Beauty'),
  ('Mascara volume', '340001000004', 'Mascara effet volume', 18.90, 35, 'Maquillage', 'Natus Beauty'),
  ('Eau micellaire', '340001000005', 'Démaquillant 400ml', 15.90, 60, 'Nettoyage', 'Natus Beauty'),
  ('Parfum floral 50ml', '340001000006', 'Eau de parfum florale', 65.00, 20, 'Parfum', 'Natus Beauty');
