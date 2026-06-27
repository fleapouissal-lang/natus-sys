import type { Sale } from "@/lib/types";
import type {
  AnalyticsDailyPoint,
  AnalyticsHourlyPoint,
  AnalyticsKpi,
  AnalyticsPaymentSlice,
  AnalyticsStoreRank,
  AnalyticsTopCashier,
  AnalyticsTopProduct,
  AnalyticsTrend,
  DashboardAnalyticsPayload,
} from "@/lib/dashboard/analytics-types";
import { toLocalDateKey } from "@/lib/utils";

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function computeKpi(sales: Sale[]): AnalyticsKpi {
  const active = sales.filter((s) => !s.cancelled_at);
  const revenue = active.reduce((sum, s) => sum + Number(s.total), 0);
  const cashRevenue = active
    .filter((s) => s.payment_method === "cash")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const cardRevenue = active
    .filter((s) => s.payment_method === "card")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const chequeRevenue = active
    .filter((s) => s.payment_method === "cheque")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const cancelledCount = sales.filter((s) => s.cancelled_at).length;

  return {
    revenue,
    salesCount: active.length,
    averageTicket: active.length > 0 ? revenue / active.length : 0,
    cashRevenue,
    cardRevenue,
    chequeRevenue,
    cancelledCount,
    cancellationRate: sales.length > 0 ? (cancelledCount / sales.length) * 100 : 0,
  };
}

function computeTrend(current: AnalyticsKpi, previous: AnalyticsKpi | null): AnalyticsTrend {
  if (!previous) {
    return { revenueDelta: null, salesDelta: null, ticketDelta: null };
  }
  return {
    revenueDelta: pctDelta(current.revenue, previous.revenue),
    salesDelta: pctDelta(current.salesCount, previous.salesCount),
    ticketDelta: pctDelta(current.averageTicket, previous.averageTicket),
  };
}

function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

function buildDailySeries(sales: Sale[], from: Date, to: Date): AnalyticsDailyPoint[] {
  const active = sales.filter((s) => !s.cancelled_at);
  const map = new Map<string, AnalyticsDailyPoint>();

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const key = toLocalDateKey(cursor);
    map.set(key, { dateKey: key, label: dayLabel(key), revenue: 0, sales: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const sale of active) {
    const key = toLocalDateKey(sale.created_at);
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(sale.total);
    bucket.sales += 1;
  }

  return [...map.values()];
}

function buildPaymentMix(kpi: AnalyticsKpi): AnalyticsPaymentSlice[] {
  const total = kpi.revenue;
  const slices = [
    { method: "cash", label: "Espèces", amount: kpi.cashRevenue },
    { method: "card", label: "TPE", amount: kpi.cardRevenue },
    { method: "cheque", label: "Chèque", amount: kpi.chequeRevenue },
  ].filter((s) => s.amount > 0);

  return slices.map((s) => ({
    ...s,
    percent: total > 0 ? (s.amount / total) * 100 : 0,
  }));
}

function unwrapName(
  value:
    | { full_name: string | null; email: string }
    | { full_name: string | null; email: string }[]
    | null
    | undefined
): string {
  if (!value) return "—";
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name || row?.email || "—";
}

function buildTopProducts(sales: Sale[], limit = 8): AnalyticsTopProduct[] {
  const map = new Map<string, AnalyticsTopProduct>();

  for (const sale of sales) {
    if (sale.cancelled_at) continue;
    for (const item of sale.sale_items || []) {
      const name = item.products?.name || "Produit";
      const existing = map.get(name) || { name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.quantity * Number(item.unit_price);
      map.set(name, existing);
    }
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

function buildTopCashiers(sales: Sale[], limit = 6): AnalyticsTopCashier[] {
  const map = new Map<string, AnalyticsTopCashier>();

  for (const sale of sales) {
    if (sale.cancelled_at) continue;
    const name = unwrapName(sale.profiles);
    const existing = map.get(name) || { name, sales: 0, revenue: 0 };
    existing.sales += 1;
    existing.revenue += Number(sale.total);
    map.set(name, existing);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

function buildStoreRanking(
  sales: Sale[],
  storeMeta: Map<string, { name: string; city: string }>
): AnalyticsStoreRank[] {
  const map = new Map<string, AnalyticsStoreRank>();
  let totalRevenue = 0;

  for (const sale of sales) {
    if (sale.cancelled_at || !sale.store_id) continue;
    const meta = storeMeta.get(sale.store_id) || {
      name: sale.stores?.name || "Magasin",
      city: sale.stores?.city || "—",
    };
    const existing = map.get(sale.store_id) || {
      storeId: sale.store_id,
      storeName: meta.name,
      city: meta.city,
      revenue: 0,
      sales: 0,
      share: 0,
    };
    existing.revenue += Number(sale.total);
    existing.sales += 1;
    totalRevenue += Number(sale.total);
    map.set(sale.store_id, existing);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      share: totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildHourlySeries(sales: Sale[]): AnalyticsHourlyPoint[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}h`,
    sales: 0,
    revenue: 0,
  }));

  for (const sale of sales) {
    if (sale.cancelled_at) continue;
    const hour = new Date(sale.created_at).getHours();
    buckets[hour].sales += 1;
    buckets[hour].revenue += Number(sale.total);
  }

  return buckets;
}

export function buildDashboardAnalytics(input: {
  currentSales: Sale[];
  previousSales: Sale[] | null;
  from: Date;
  to: Date;
  periodLabel: string;
  previousPeriodLabel: string;
  scopeLabel: string;
  storeMeta: Map<string, { name: string; city: string }>;
  stockAlerts: number;
  totalUnits: number;
  catalogueSize: number;
}): DashboardAnalyticsPayload {
  const current = computeKpi(input.currentSales);
  const previous = input.previousSales ? computeKpi(input.previousSales) : null;

  return {
    periodLabel: input.periodLabel,
    previousPeriodLabel: input.previousPeriodLabel,
    scopeLabel: input.scopeLabel,
    current,
    previous,
    trend: computeTrend(current, previous),
    dailySeries: buildDailySeries(input.currentSales, input.from, input.to),
    paymentMix: buildPaymentMix(current),
    topProducts: buildTopProducts(input.currentSales),
    topCashiers: buildTopCashiers(input.currentSales),
    storeRanking: buildStoreRanking(input.currentSales, input.storeMeta),
    hourlySeries: buildHourlySeries(input.currentSales),
    stockAlerts: input.stockAlerts,
    totalUnits: input.totalUnits,
    catalogueSize: input.catalogueSize,
  };
}