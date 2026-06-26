export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Devise marocaine — dirham (DH) */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} DH`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date(date));
}

import { paymentMethodLabel } from "@/lib/constants/sales";

export function formatPaymentMethod(method: string): string {
  return paymentMethodLabel(method);
}

export function formatShopifyStatus(status: string | null | undefined): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    open: "Ouverte",
    closed: "Clôturée",
    cancelled: "Annulée",
    paid: "Payée",
    pending: "En attente",
    refunded: "Remboursée",
    fulfilled: "Expédiée",
    partial: "Partielle",
    unfulfilled: "Non expédiée",
  };
  return map[status.toLowerCase()] || status;
}

export function toLocalDateKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-CA");
}

/** Supabase nested selects often return T or T[] — normalize to one row. */
export function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
