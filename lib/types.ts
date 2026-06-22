export type PaymentMethod = "cash" | "card";

export type UserRole = "directeur" | "admin" | "manager" | "cashier" | "livreur" | "hub";

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
  is_hub?: boolean;
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
  is_store_pos?: boolean;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
}

export type ProductKind = "simple" | "parent" | "variant";

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  categories?: string[];
  product_kind?: ProductKind;
  parent_id?: string | null;
  parent_name?: string | null;
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
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  shopify_order_id: string | null;
  loyalty_discount: number;
  loyalty_points_redeemed: number;
  loyalty_points_earned: number;
  promo_code: string | null;
  promo_discount: number;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email">;
  stores?: Pick<Store, "name" | "city"> | null;
  sale_items?: SaleItem[];
  customers?: Pick<LoyaltyCustomer, "full_name" | "card_number" | "phone"> | null;
}

export type LoyaltyTier = "bronze" | "silver" | "gold";

export type LoyaltyTransactionType = "earn" | "redeem";

export type LoyaltyCardVariant = "champagne" | "noir" | "creme";

export interface LoyaltyCustomer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  card_number: string;
  loyalty_points: number;
  qr_token: string;
  store_id: string | null;
  card_variant?: LoyaltyCardVariant;
  apple_wallet_pass_id: string | null;
  google_wallet_pass_id: string | null;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  sale_id: string | null;
  shopify_order_id?: string | null;
  type: LoyaltyTransactionType;
  points: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LoyaltyStats {
  totalMembers: number;
  pointsDistributed: number;
  pointsRedeemed: number;
  topCustomers: {
    id: string;
    full_name: string;
    card_number: string;
    loyalty_points: number;
    phone: string;
  }[];
}

export interface LoyaltySettings {
  pointsPerMad: number;
  pointValueMad: number;
  minPointsToRedeem: number;
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

export type ActivityKind =
  | "stock_add"
  | "stock_adjustment"
  | "stock_transfer_in"
  | "stock_transfer_out"
  | "sale";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  created_at: string;
  store_id: string | null;
  store_name: string | null;
  store_city: string | null;
  related_store_name: string | null;
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
  action_label: string;
  related_store_name?: string | null;
}

export type HubStockTransferStatus = "sent" | "received";

export interface HubStockTransferItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_barcode: string;
}

export interface HubStockTransfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  status: HubStockTransferStatus;
  notes: string | null;
  created_by: string;
  received_by: string | null;
  sent_at: string;
  received_at: string | null;
  from_store_name: string | null;
  to_store_name: string | null;
  creator_name: string | null;
  receiver_name: string | null;
  items: HubStockTransferItem[];
  total_units: number;
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
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  store_assignment_locked: boolean;
  transferred_from_store_id: string | null;
  transferred_at: string | null;
  transferred_by: string | null;
  assigned_livreur_id: string | null;
  return_note: string | null;
  return_note_at: string | null;
  return_note_by: string | null;
  return_received_at: string | null;
  return_received_by: string | null;
  total: number;
  currency: string;
  line_items: ShopifyLineItemRow[];
  tracking_token?: string;
  customer_confirmed_at?: string | null;
  whatsapp_confirmation_sent_at?: string | null;
  whatsapp_status_notifications?: Record<string, string> | null;
  cashier_confirmation_status?:
    | "confirmed"
    | "not_confirmed"
    | "no_response"
    | "not_interested"
    | null;
  cashier_confirmation_note?: string | null;
  cashier_confirmation_at?: string | null;
  cashier_confirmation_by?: string | null;
  loyalty_points_earned?: number;
  customer_id?: string | null;
  shopify_created_at: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
  transferred_from_store?: Pick<Store, "name" | "city"> | null;
}
