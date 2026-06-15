import type { ShopifyOrder } from "@/lib/types";
import type { ShopifyOrderPosContext } from "@/lib/orders";

export function canPrepareOrderForPos(order: ShopifyOrder): boolean {
  return (
    !order.sale_id &&
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
  };
}
