import type { ShopifyOrderPayload } from "@/lib/shopify/types";
import type { ShopifyPaymentType, ShopifyWorkflowStatus } from "@/lib/shopify/order-status";

const COD_KEYWORDS = [
  "cod",
  "cash on delivery",
  "cash_on_delivery",
  "paiement a la livraison",
  "paiement à la livraison",
  "livraison",
  "contre remboursement",
];

export function detectPaymentType(order: ShopifyOrderPayload): ShopifyPaymentType {
  const gateways = [
    order.gateway,
    ...(order.payment_gateway_names || []),
  ]
    .filter(Boolean)
    .map((g) => String(g).toLowerCase());

  const tags = (order.tags || "").toLowerCase();

  const isCod =
    gateways.some((g) => COD_KEYWORDS.some((k) => g.includes(k))) ||
    COD_KEYWORDS.some((k) => tags.includes(k));

  if (isCod) return "cod";

  if (
    order.financial_status === "pending" &&
    gateways.some((g) => g.includes("manual") || g === "bogus")
  ) {
    return "cod";
  }

  return "online";
}

export function resolveWorkflowStatus(order: ShopifyOrderPayload): ShopifyWorkflowStatus {
  if (order.cancelled_at) return "cancelled";
  if (order.financial_status === "paid" || order.financial_status === "partially_paid") {
    return "paid";
  }
  if (order.fulfillment_status === "fulfilled") return "delivered";
  return "pending";
}

export function resolvePaymentGateway(order: ShopifyOrderPayload): string | null {
  return order.gateway || order.payment_gateway_names?.[0] || null;
}
