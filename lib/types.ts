export type PaymentMethod = "cash" | "card";

export type UserRole = "directeur" | "manager" | "cashier";

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreInventoryRow {
  store_id: string;
  product_id: string;
  stock: number;
  updated_at: string;
  products?: Pick<Product, "name" | "barcode" | "category" | "price" | "image_url">;
}

export interface StoreWithStats extends Store {
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  cashiers: CashierSummary[];
}

export interface CashierSummary {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  city: string | null;
  store_id: string | null;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  cashier_id: string;
  total: number;
  payment_method: PaymentMethod;
  store_id: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email">;
  stores?: Pick<Store, "name" | "city"> | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: Pick<Product, "name" | "barcode">;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: "add" | "sale" | "adjustment";
  notes: string | null;
  created_by: string | null;
  store_id: string | null;
  created_at: string;
  products?: Pick<Product, "name" | "barcode">;
  stores?: Pick<Store, "name"> | null;
}

export type ActivityKind = "stock_add" | "stock_adjustment" | "sale";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  created_at: string;
  store_id: string | null;
  store_name: string | null;
  store_city: string | null;
  actor_name: string | null;
  actor_role: UserRole | null;
  title: string;
  detail: string | null;
  quantity: number | null;
  amount: number | null;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  todaySales: number;
  todayRevenue: number;
}
