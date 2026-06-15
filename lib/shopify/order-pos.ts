import type { ShopifyOrder } from "@/lib/types";
import type { ShopifyOrderPosContext } from "@/lib/orders";
import { isShopifyOrderFulfilled } from "@/lib/shopify/order-status";

export function canPrepareOrderForPos(order: ShopifyOrder): boolean {
  return (
    !isShopifyOrderFulfilled(order) &&
    order.workflow_status !== "cancelled" &&
    order.workflow_status !== "returned"
  );
}

export function shopifyOrderToPosContext(order: ShopifyOrder): ShopifyOrderPosContext {
  return {
    id: order.id,
    orderNumber: order.order_number,
    paymentType: order.payment_type,
    customerName: order.customer_name,
    defaultPayment: order.payment_type === "cod" ? "cash" : "card",
    workflowStatus: order.workflow_status,
  };
}
