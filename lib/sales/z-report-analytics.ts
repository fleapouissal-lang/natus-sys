import type {
  ZReportAnalytics,
  ZReportClosureBlock,
  ZReportClosureSummary,
  ZReportPayload,
  ZReportProductRow,
} from "@/lib/sales/z-report-types";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import type { Sale } from "@/lib/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function paymentLabel(method: Sale["payment_method"]): string {
  if (method === "cash") return "Espèces";
  if (method === "card") return "TPE";
  return "Chèque";
}

export function pickLatestValidatedClosures(
  closures: StoreDayClosureReportRow[],
  storeId?: string | null
): StoreDayClosureReportRow[] {
  const validated = closures.filter((closure) => closure.status === "validated");

  if (storeId) {
    const forStore = validated
      .filter((closure) => closure.store_id === storeId)
      .sort((a, b) => b.business_date.localeCompare(a.business_date));
    return forStore.slice(0, 1);
  }

  const byStore = new Map<string, StoreDayClosureReportRow>();
  for (const closure of validated) {
    const existing = byStore.get(closure.store_id);
    if (!existing || closure.business_date > existing.business_date) {
      byStore.set(closure.store_id, closure);
    }
  }

  return [...byStore.values()].sort((a, b) => b.business_date.localeCompare(a.business_date));
}

function aggregateProducts(blocks: ZReportClosureBlock[]): ZReportProductRow[] {
  const map = new Map<string, { name: string; barcode: string | null; quantity: number; revenue: number }>();

  for (const block of blocks) {
    for (const sale of block.sales) {
      if (sale.cancelled_at) continue;
      for (const item of sale.sale_items || []) {
        const name = item.products?.name?.trim() || "Produit";
        const barcode = item.products?.barcode ?? null;
        const key = item.product_id || `${name}|${barcode ?? ""}`;
        const qty = Number(item.quantity);
        const revenue = qty * Number(item.unit_price);
        const existing = map.get(key);
        if (existing) {
          existing.quantity += qty;
          existing.revenue += revenue;
        } else {
          map.set(key, { name, barcode, quantity: qty, revenue });
        }
      }
    }
  }

  const totalRevenue = [...map.values()].reduce((sum, row) => sum + row.revenue, 0);
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((row) => ({
      ...row,
      revenue: roundMoney(row.revenue),
      share: totalRevenue > 0 ? roundMoney((row.revenue / totalRevenue) * 100) : 0,
    }));
}

function buildHourlySeries(sales: Sale[]): ZReportAnalytics["hourlySeries"] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    sales: 0,
    revenue: 0,
  }));

  for (const sale of sales) {
    if (sale.cancelled_at) continue;
    const hour = new Date(sale.created_at).getHours();
    buckets[hour]!.sales += 1;
    buckets[hour]!.revenue += Number(sale.total);
  }

  return buckets.map((point) => ({
    ...point,
    revenue: roundMoney(point.revenue),
  }));
}

export function buildZReportAnalytics(blocks: ZReportClosureBlock[]): ZReportAnalytics {
  const activeSales = blocks.flatMap((block) => block.sales.filter((sale) => !sale.cancelled_at));
  const cancelledSales = blocks.flatMap((block) => block.sales.filter((sale) => sale.cancelled_at));

  const totalRevenue = activeSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalSales = activeSales.length;
  const cash = activeSales
    .filter((sale) => sale.payment_method === "cash")
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const card = activeSales
    .filter((sale) => sale.payment_method === "card")
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const cheque = activeSales
    .filter((sale) => sale.payment_method === "cheque")
    .reduce((sum, sale) => sum + Number(sale.total), 0);

  const paymentMix: ZReportAnalytics["paymentMix"] = [
    { label: "Espèces", amount: roundMoney(cash), percent: 0 },
    { label: "TPE", amount: roundMoney(card), percent: 0 },
    { label: "Chèque", amount: roundMoney(cheque), percent: 0 },
  ].map((slice) => ({
    ...slice,
    percent: totalRevenue > 0 ? roundMoney((slice.amount / totalRevenue) * 100) : 0,
  }));

  const closureSummaries: ZReportClosureSummary[] = blocks.map(({ closure }) => ({
    storeName: closure.store_name,
    storeCity: closure.store_city,
    businessDate: closure.business_date,
    stats: closure.stats,
    validatedAt: closure.validated_at,
  }));

  const storeRanking: ZReportAnalytics["storeRanking"] = closureSummaries
    .map((summary) => ({
      storeName: summary.storeName,
      city: summary.storeCity,
      businessDate: summary.businessDate,
      revenue: summary.stats.total,
      sales: summary.stats.count,
      share: totalRevenue > 0 ? roundMoney((summary.stats.total / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue: roundMoney(totalRevenue),
    totalSales,
    averageTicket: totalSales > 0 ? roundMoney(totalRevenue / totalSales) : 0,
    cash: roundMoney(cash),
    card: roundMoney(card),
    cheque: roundMoney(cheque),
    cancelledCount: cancelledSales.length,
    cancelledTotal: roundMoney(
      cancelledSales.reduce((sum, sale) => sum + Number(sale.total), 0)
    ),
    paymentMix,
    topProducts: aggregateProducts(blocks),
    storeRanking,
    hourlySeries: buildHourlySeries(blocks.flatMap((block) => block.sales)),
    closureSummaries,
  };
}

export function buildZReportPayload(
  scopeLabel: string,
  blocks: ZReportClosureBlock[],
  mode: ZReportPayload["mode"]
): ZReportPayload {
  return {
    scopeLabel,
    generatedAt: new Date().toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    mode,
    closures: blocks,
    analytics: buildZReportAnalytics(blocks),
  };
}

export function formatZReportFilename(scopeLabel: string, mode: ZReportPayload["mode"]): string {
  const dateKey = new Date().toISOString().slice(0, 10);
  const slug = scopeLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const suffix = mode === "multi" ? "multi" : "site";
  return `z-rapport-${suffix}-${slug || "natus"}-${dateKey}.xlsx`;
}

export { paymentLabel };
