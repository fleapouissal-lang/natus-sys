import type { ShopifyOrder } from "@/lib/types";

export type CashierConfirmationStatus =
  | "confirmed"
  | "not_confirmed"
  | "no_response"
  | "not_interested";

export const CONFIRMATION_CALL_DELAY_MS = 4 * 60 * 60 * 1000;

export const CASHIER_CONFIRMATION_STATUS_LABELS: Record<
  CashierConfirmationStatus,
  string
> = {
  confirmed: "Confirmée (appel)",
  not_confirmed: "Non confirmée",
  no_response: "Pas de réponse",
  not_interested: "Pas intéressé",
};

type ConfirmationOrder = Pick<
  ShopifyOrder,
  | "whatsapp_confirmation_sent_at"
  | "customer_confirmed_at"
  | "cashier_confirmation_status"
>;

export function isWhatsAppConfirmationPending(order: ConfirmationOrder): boolean {
  return Boolean(
    order.whatsapp_confirmation_sent_at &&
      !order.customer_confirmed_at &&
      !order.cashier_confirmation_status
  );
}

export function isConfirmationCallOverdue(order: ConfirmationOrder): boolean {
  if (!isWhatsAppConfirmationPending(order)) return false;
  const sentAt = new Date(order.whatsapp_confirmation_sent_at!).getTime();
  return Date.now() - sentAt >= CONFIRMATION_CALL_DELAY_MS;
}

export function confirmationFollowUpBadge(order: ConfirmationOrder): {
  label: string;
  variant: "success" | "warning" | "danger" | "default";
} | null {
  if (order.customer_confirmed_at) {
    return { label: "Confirmée client", variant: "success" };
  }

  if (order.cashier_confirmation_status) {
    const label =
      CASHIER_CONFIRMATION_STATUS_LABELS[order.cashier_confirmation_status];
    const variant =
      order.cashier_confirmation_status === "confirmed"
        ? "success"
        : order.cashier_confirmation_status === "no_response"
          ? "warning"
          : "danger";
    return { label, variant };
  }

  if (!order.whatsapp_confirmation_sent_at) return null;

  if (isConfirmationCallOverdue(order)) {
    return { label: "Appeler le client", variant: "danger" };
  }

  return { label: "En attente confirmation", variant: "warning" };
}

export function isConfirmationFollowUpResolved(order: ConfirmationOrder): boolean {
  return Boolean(
    order.customer_confirmed_at ||
      order.cashier_confirmation_status === "confirmed"
  );
}

export function hasCashierConfirmationNote(
  order: Pick<ShopifyOrder, "cashier_confirmation_note" | "cashier_confirmation_status">
): boolean {
  if (order.cashier_confirmation_status === "confirmed") return false;
  return Boolean(order.cashier_confirmation_note?.trim());
}
