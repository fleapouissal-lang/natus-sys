import type { ShopifyPaymentType, ShopifyWorkflowStatus } from "@/lib/types";

export type { ShopifyPaymentType, ShopifyWorkflowStatus };

export const WORKFLOW_STATUSES: ShopifyWorkflowStatus[] = [
  "pending",
  "preparing",
  "ready",
  "shipping",
  "delivered",
  "returned",
  "paid",
  "cancelled",
];

export function workflowStatusLabel(status: ShopifyWorkflowStatus): string {
  const map: Record<ShopifyWorkflowStatus, string> = {
    pending: "En attente",
    preparing: "En préparation",
    ready: "Prête",
    shipping: "En cours de livraison",
    delivered: "Bien livré",
    returned: "Retour",
    paid: "Payée",
    cancelled: "Annulée",
  };
  return map[status];
}

export function paymentTypeLabel(type: ShopifyPaymentType): string {
  return type === "cod" ? "COD" : "E.L";
}

export const FULFILLMENT_STATUSES: ShopifyWorkflowStatus[] = [
  "preparing",
  "ready",
  "shipping",
  "delivered",
  "returned",
];

export const COD_FULFILLMENT_STATUSES: ShopifyWorkflowStatus[] = [
  "pending",
  "preparing",
  "ready",
  "shipping",
  "delivered",
  "returned",
];

export function isFulfillmentLocked(status: ShopifyWorkflowStatus): boolean {
  return (
    status === "cancelled" ||
    status === "delivered" ||
    status === "returned"
  );
}

export function isOrderPaymentSettled(order: {
  payment_type: ShopifyPaymentType;
  financial_status: string | null;
  workflow_status: ShopifyWorkflowStatus;
  sale_id?: string | null;
}): boolean {
  if (order.payment_type === "online") return true;
  if (order.financial_status === "paid" || order.workflow_status === "paid") {
    return true;
  }
  return false;
}

/** Valeur affichée dans le select (paid = déjà payé en ligne → en préparation) */
export function orderStatusSelectValue(order: {
  workflow_status: ShopifyWorkflowStatus;
}): ShopifyWorkflowStatus {
  if (order.workflow_status === "paid") return "preparing";
  return order.workflow_status;
}

export function editableWorkflowStatuses(order: {
  payment_type: ShopifyPaymentType;
  financial_status: string | null;
  workflow_status: ShopifyWorkflowStatus;
  sale_id?: string | null;
}): ShopifyWorkflowStatus[] {
  return isOrderPaymentSettled(order)
    ? FULFILLMENT_STATUSES
    : COD_FULFILLMENT_STATUSES;
}
