export interface ShopifyAddress {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  zip?: string | null;
  phone?: string | null;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku?: string | null;
  variant_id?: number | null;
}

export interface ShopifyOrderPayload {
  id: number;
  order_number: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  closed_at?: string | null;
  total_price: string;
  currency: string;
  created_at: string;
  shipping_address?: ShopifyAddress | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  line_items: ShopifyLineItem[];
}
