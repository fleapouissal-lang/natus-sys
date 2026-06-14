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
  }).format(new Date(date));
}

export function formatPaymentMethod(method: string): string {
  return method === "card" ? "Carte bancaire" : "Espèces";
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
