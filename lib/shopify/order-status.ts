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
    status === "returned" ||
    status === "paid"
  );
}

/** Livraison confirmée — n'impacte pas la caisse physique. */
export function resolveWorkflowStatusUpdate(
  status: ShopifyWorkflowStatus
): ShopifyWorkflowStatus {
  return status;
}

export function isShopifyOrderFulfilled(order: {
  fulfilled_at?: string | null;
  sale_id?: string | null;
}): boolean {
  return Boolean(order.fulfilled_at || order.sale_id);
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

/** Valeur affichée dans le select */
export function orderStatusSelectValue(order: {
  workflow_status: ShopifyWorkflowStatus;
}): ShopifyWorkflowStatus {
  return order.workflow_status;
}

export function livreurWorkflowStatuses(): ShopifyWorkflowStatus[] {
  return ["delivered", "returned"];
}

/** Statuts livreur — livraisons actives (hors retours). */
export function livreurDeliveryOrderStatuses(): ShopifyWorkflowStatus[] {
  return ["ready", "shipping", "delivered", "paid"];
}

/** Statuts visibles par le livreur (du jour : en attente, en route, clôturées). */
export function livreurActiveOrderStatuses(): ShopifyWorkflowStatus[] {
  return ["ready", "shipping", "delivered", "paid", "returned"];
}

/** Onglet « Livraisons » : commandes assignées encore à livrer. */
export function livreurPendingDeliveryStatuses(): ShopifyWorkflowStatus[] {
  return ["ready", "shipping"];
}

/** Onglet « Historique des livraisons » : commandes livrées / clôturées. */
export function livreurDeliveryHistoryStatuses(): ShopifyWorkflowStatus[] {
  return ["delivered", "paid", "returned"];
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
