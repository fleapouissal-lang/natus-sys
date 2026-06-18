import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/loyalty/phone";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import type { ShopifyWorkflowStatus } from "@/lib/types";

export type CustomerOrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  tracking_token: string | null;
  workflow_status: ShopifyWorkflowStatus;
  total: number;
  updated_at: string;
  cashier_confirmation_note?: string | null;
};

function phoneDigits(phone: string | null): string | null {
  if (!phone) return null;
  const n = normalizePhone(phone);
  return n ? n.replace(/\D/g, "") : null;
}

export async function findLatestOrderByPhone(
  phoneKey: string
): Promise<CustomerOrderRow | null> {
  const admin = createAdminClient();
  const target = phoneKey.replace(/\D/g, "");

  const { data } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, tracking_token, workflow_status, total, updated_at, cashier_confirmation_note"
    )
    .not("customer_phone", "is", null)
    .order("shopify_created_at", { ascending: false })
    .limit(120);

  const orders = (data || []) as CustomerOrderRow[];
  return orders.find((o) => phoneDigits(o.customer_phone) === target) ?? null;
}

export function orderSummaryForAi(order: CustomerOrderRow): string {
  return `${order.order_number}, statut ${workflowStatusLabel(order.workflow_status)}, total ${order.total} MAD`;
}

export function formatOrderStatusReply(order: CustomerOrderRow): string {
  const name = order.customer_name?.trim() || "Client";
  return [
    `Bonjour ${name} 👋`,
    "",
    `Votre dernière commande : ${order.order_number}`,
    `Statut : ${workflowStatusLabel(order.workflow_status)}`,
    "",
    "Souhaitez-vous plus de détails ?",
  ].join("\n");
}
