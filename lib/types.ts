export type PaymentMethod = "cash" | "card";

export type UserRole = "directeur" | "manager" | "cashier";

export type ShopifyPaymentType = "online" | "cod";

export type ShopifyWorkflowStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "shipping"
  | "delivered"
  | "returned"
  | "paid"
  | "cancelled";

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
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
  sale_items?: SaleItem[];
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

export interface StoreOverviewRow {
  storeId: string;
  storeName: string;
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  totalRevenue: number;
  totalSales: number;
  lowStockCount: number;
  totalUnits: number;
}

export interface StoreRecentSale {
  id: string;
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
  cashier_name: string | null;
}

export interface StoreRecentOrder {
  id: string;
  order_number: string;
  total: number;
  payment_type: ShopifyPaymentType;
  workflow_status: ShopifyWorkflowStatus;
  customer_name: string | null;
  created_at: string;
}

export interface StoreRecentStock {
  id: string;
  product_name: string;
  quantity: number;
  created_at: string;
  actor_name: string | null;
}

export interface StoreSnapshot {
  storeId: string;
  storeName: string;
  recentSales: StoreRecentSale[];
  recentOrders: StoreRecentOrder[];
  recentStockAdds: StoreRecentStock[];
}

export interface ShopifyLineItemRow {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku?: string | null;
  variant_id?: number | null;
}

export interface ShopifyOrder {
  id: string;
  shopify_order_id: number;
  order_number: string;
  store_id: string | null;
  city: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_lat: number | null;
  shipping_lng: number | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  order_status: string;
  payment_type: ShopifyPaymentType;
  workflow_status: ShopifyWorkflowStatus;
  payment_gateway: string | null;
  paid_at: string | null;
  paid_by: string | null;
  sale_id: string | null;
  total: number;
  currency: string;
  line_items: ShopifyLineItemRow[];
  shopify_created_at: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
}
