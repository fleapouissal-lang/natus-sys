export type PaymentMethod = "cash" | "card" | "cheque";

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
  current_business_date?: string;
  created_at: string;
}

export interface StoreInventoryRow {
  store_id: string;
  product_id: string;
  stock: number;
  updated_at: string;
  products?: Pick<Product, "name" | "barcode" | "category" | "price" | "image_url">;
}

export interface StorePosAccountSummary {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface StoreWithStats extends Store {
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  cashiers: CashierSummary[];
  posAccount?: StorePosAccountSummary | null;
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
  access_preset?: string | null;
  allowed_pages?: string[] | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  stores?: Pick<Store, "name" | "city"> | null;
}

export type ProductKind = "simple" | "parent" | "variant";

export interface Product {
  id: string;
  name: string;
  product_code?: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  compare_at_price?: number | null;
  classification?: string | null;
  stock: number;
  category: string | null;
  categories?: string[];
  product_kind?: ProductKind;
  parent_id?: string | null;
  parent_name?: string | null;
  parent_image_url?: string | null;
  parent_category?: string | null;
  parent_categories?: string[];
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
  customer_ice: string | null;
  shopify_order_id: string | null;
  loyalty_discount: number;
  loyalty_points_redeemed: number;
  loyalty_points_earned: number;
  promo_code: string | null;
  promo_discount: number;
  pro_client_discount: number;
  cancelled_at: string | null;
  cancelled_by: string | null;
  invoice_validated_at: string | null;
  invoice_validated_by: string | null;
  business_date?: string;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email">;
  stores?: Pick<Store, "name" | "city"> | null;
  sale_items?: SaleItem[];
  customers?: Pick<LoyaltyCustomer, "full_name" | "card_number" | "phone" | "is_pro_client"> | null;
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
  is_pro_client?: boolean;
  pro_client_active?: boolean;
  pro_client_type?: "entreprise" | "particulier" | null;
  company_name?: string | null;
  responsible_name?: string | null;
  company_ice?: string | null;
  company_rc?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  is_active?: boolean;
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

export type CustomerNoteSource = "shopify_order" | "cashier_follow_up" | "whatsapp";

export interface CustomerNote {
  id: string;
  customer_id: string;
  shopify_order_id: string | null;
  source: CustomerNoteSource;
  body: string;
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
  outOfStockCount: number;
  todaySales: number;
  todayRevenue: number;
}

export interface StoreOutOfStockProduct {
  id: string;
  name: string;
  category: string | null;
  barcode: string | null;
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

export type HubStockTransferStatus =
  | "en_cours"
  | "pret"
  | "en_livraison"
  | "livre"
  | "sent"
  | "received";

export interface HubStockTransferItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_barcode: string;
  product_image_url?: string | null;
}

export interface HubStockTransfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  status: HubStockTransferStatus;
  notes: string | null;
  created_by: string;
  received_by: string | null;
  assigned_livreur_id: string | null;
  assigned_livreur_name: string | null;
  sent_at: string;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  from_store_name: string | null;
  to_store_name: string | null;
  from_store_city?: string | null;
  to_store_city?: string | null;
  from_store_is_hub?: boolean;
  to_store_is_hub?: boolean;
  creator_name: string | null;
  receiver_name: string | null;
  items: HubStockTransferItem[];
  total_units: number;
}

export type StoreStockTransferStatus =
  | "en_cours"
  | "pret"
  | "en_livraison"
  | "livre"
  | "received";

export interface StoreStockTransferItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_barcode: string;
  product_code?: string | null;
  product_image_url?: string | null;
}

export interface StoreStockTransfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  status: StoreStockTransferStatus;
  notes: string | null;
  created_by: string;
  received_by: string | null;
  assigned_livreur_id: string | null;
  assigned_livreur_name?: string | null;
  sent_at: string;
  ready_at: string | null;
  shipped_at: string | null;
  picked_up_at?: string | null;
  delivered_at: string | null;
  received_at: string | null;
  from_store_name: string | null;
  to_store_name: string | null;
  from_store_city?: string | null;
  to_store_city?: string | null;
  creator_name: string | null;
  receiver_name: string | null;
  shipper_name?: string | null;
  items: StoreStockTransferItem[];
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
  assigned_livreur_name?: string | null;
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

export interface FabricationProduct {
  id: string;
  name: string;
  product_code: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  is_active: boolean;
  stock: number;
  created_at?: string;
  updated_at?: string;
}
