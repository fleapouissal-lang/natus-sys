const HOUR_MS = 60 * 60 * 1000;

export const ORDER_AGE_FRESH_MS = 2 * HOUR_MS;
export const ORDER_AGE_OVERDUE_MS = 4 * HOUR_MS;

export type OrderAgeUrgency = "fresh" | "attention" | "overdue";

export function orderCreatedAt(order: {
  shopify_created_at?: string | null;
  created_at: string;
}): string {
  return order.shopify_created_at || order.created_at;
}

export function orderAgeMs(
  isoDate: string,
  now = Date.now()
): number {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, now - t);
}

export function orderAgeUrgency(
  isoDate: string,
  now = Date.now()
): OrderAgeUrgency {
  const ageMs = orderAgeMs(isoDate, now);
  if (ageMs < ORDER_AGE_FRESH_MS) return "fresh";
  if (ageMs < ORDER_AGE_OVERDUE_MS) return "attention";
  return "overdue";
}

export function formatOrderAgeShort(isoDate: string, now = Date.now()): string {
  const ageMs = orderAgeMs(isoDate, now);
  const dayMs = 24 * HOUR_MS;

  if (ageMs >= dayMs) {
    const days = Math.floor(ageMs / dayMs);
    return days === 1 ? "1 j" : `${days} j`;
  }

  const totalMinutes = Math.floor(ageMs / (60 * 1000));
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes}`;
}

export function orderAgeBadgeTitle(isoDate: string, now = Date.now()): string {
  const ageMs = orderAgeMs(isoDate, now);
  const dayMs = 24 * HOUR_MS;
  if (ageMs >= dayMs) {
    const days = Math.floor(ageMs / dayMs);
    return days === 1 ? "Commande il y a 1 jour" : `Commande il y a ${days} jours`;
  }
  return ORDER_AGE_BADGE_STYLES[orderAgeUrgency(isoDate, now)].title;
}
export const ORDER_AGE_BADGE_STYLES: Record<
  OrderAgeUrgency,
  { className: string; title: string }
> = {
  fresh: {
    className: "bg-green-100 text-green-800 border-green-200/80",
    title: "Commande de moins de 2 h",
  },
  attention: {
    className: "bg-orange-100 text-orange-800 border-orange-200/80",
    title: "Commande entre 2 h et 4 h",
  },
  overdue: {
    className: "bg-red-100 text-red-800 border-red-200/80",
    title: "Commande de plus de 4 h",
  },
};
