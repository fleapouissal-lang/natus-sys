import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopifyLineItemRow, ShopifyPaymentType, ShopifyWorkflowStatus } from "@/lib/types";

export type PublicShopifyOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  workflow_status: ShopifyWorkflowStatus;
  payment_type: ShopifyPaymentType;
  total: number;
  currency: string;
  line_items: ShopifyLineItemRow[];
  customer_confirmed_at: string | null;
  shipping_address: string | null;
  city: string;
  loyalty_points_earned: number;
  created_at: string;
  updated_at: string;
};

export async function getPublicShopifyOrder(
  trackingToken: string
): Promise<PublicShopifyOrder | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_public_shopify_order", {
    p_token: trackingToken,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as PublicShopifyOrder;
}
