"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getHubAssignedStores } from "@/lib/hub";
import { getActiveStores, getStoresWithStats } from "@/lib/inventory";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import { buildDashboardAnalytics } from "@/lib/dashboard/compute-analytics";
import {
  resolveAnalyticsPeriods,
  type DashboardReportPeriod,
} from "@/lib/dashboard/report-period";
import type {
  DashboardReportPayload,
  DashboardReportSaleRow,
  DashboardReportStockRow,
  DashboardReportSummaryRow,
} from "@/lib/dashboard/dashboard-report-types";
import { formatDate, formatPaymentMethod } from "@/lib/utils";
import type { Sale, Store } from "@/lib/types";

const SALES_LIMIT = 15000;
const MOVEMENTS_LIMIT = 8000;

function actionError(message: string): { error: string } {
  return { error: message };
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

function stockTypeLabel(type: string, quantity: number): string {
  if (type === "add") return "Ajout";
  if (type === "adjustment") return "Ajustement";
  if (type === "transfer") return quantity > 0 ? "Réception hub" : "Envoi hub";
  return type;
}

async function resolveAllowedStores(
  profile: NonNullable<Awaited<ReturnType<typeof requireRole>>>,
  requestedStoreIds: string[]
): Promise<Store[] | { error: string }> {
  let stores: Store[] = [];

  if (profile.role === "hub") {
    stores = await getHubAssignedStores(profile.id);
  } else {
    const city = getCityFilter(profile);
    const all = await getActiveStores(city);
    stores = filterRetailStoresByProfile(all, profile);
  }

  if (requestedStoreIds.length === 0) {
    return stores;
  }

  const allowedIds = new Set(stores.map((s) => s.id));
  const filtered = requestedStoreIds.filter((id) => allowedIds.has(id));
  if (filtered.length === 0) {
    return actionError("Magasin non autorisé");
  }

  return stores.filter((s) => filtered.includes(s.id));
}

function buildReportPayload(input: {
  stores: Store[];
  storeById: Map<string, Store>;
  storeMeta: Map<string, { name: string; city: string }>;
  statsByStore: Map<string, { lowStockCount: number; totalUnits: number }>;
  sales: Sale[];
  previousSales: Sale[] | null;
  movementsRaw: unknown[];
  periodLabel: string;
  previousPeriodLabel: string;
  scopeLabel: string;
  fromDate: Date;
  toDate: Date;
  stockAlerts: number;
  totalUnits: number;
  catalogueSize: number;
}): { data: DashboardReportPayload } {
  const summaryMap = new Map<string, DashboardReportSummaryRow>();

  for (const store of input.stores) {
    summaryMap.set(store.id, {
      storeName: store.name,
      city: store.city,
      salesCount: 0,
      revenue: 0,
      averageTicket: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      chequeRevenue: 0,
      lowStockCount: input.statsByStore.get(store.id)?.lowStockCount ?? 0,
      totalUnits: input.statsByStore.get(store.id)?.totalUnits ?? 0,
      stockMovements: 0,
    });
  }

  const saleRows: DashboardReportSaleRow[] = input.sales.map((sale) => {
    const store = sale.store_id ? input.storeById.get(sale.store_id) : null;
    const total = Number(sale.total);
    const summary = sale.store_id ? summaryMap.get(sale.store_id) : null;

    if (summary && !sale.cancelled_at) {
      summary.salesCount += 1;
      summary.revenue += total;
      if (sale.payment_method === "cash") summary.cashRevenue += total;
      else if (sale.payment_method === "card") summary.cardRevenue += total;
      else if (sale.payment_method === "cheque") summary.chequeRevenue += total;
    }

    return {
      date: formatDate(sale.created_at),
      storeName: store?.name || sale.stores?.name || "—",
      city: store?.city || sale.stores?.city || "—",
      cashier: unwrapName(sale.profiles),
      customer: sale.customer_name || sale.customers?.full_name || "—",
      total,
      payment: formatPaymentMethod(sale.payment_method),
      itemsCount: sale.sale_items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
      status: sale.cancelled_at ? "Annulée" : "Validée",
    };
  });

  const stockRows: DashboardReportStockRow[] = input.movementsRaw.map((raw) => {
    const row = raw as {
      store_id: string;
      created_at: string;
      quantity: number;
      type: string;
      notes: string | null;
      products: { name: string } | { name: string }[] | null;
      profiles:
        | { full_name: string | null; email: string }
        | { full_name: string | null; email: string }[]
        | null;
    };
    const store = input.storeById.get(row.store_id);
    const summary = summaryMap.get(row.store_id);
    if (summary) summary.stockMovements += 1;

    const products = row.products;
    const productName = Array.isArray(products) ? products[0]?.name : products?.name;

    return {
      date: formatDate(row.created_at),
      storeName: store?.name || "—",
      product: productName || "Produit",
      quantity: row.quantity,
      type: stockTypeLabel(row.type, row.quantity),
      actor: unwrapName(row.profiles),
      notes: row.notes || "",
    };
  });

  const summary = [...summaryMap.values()].map((row) => ({
    ...row,
    averageTicket: row.salesCount > 0 ? row.revenue / row.salesCount : 0,
  }));

  const totals = summary.reduce(
    (acc, row) => ({
      salesCount: acc.salesCount + row.salesCount,
      revenue: acc.revenue + row.revenue,
      cashRevenue: acc.cashRevenue + row.cashRevenue,
      cardRevenue: acc.cardRevenue + row.cardRevenue,
      chequeRevenue: acc.chequeRevenue + row.chequeRevenue,
    }),
    { salesCount: 0, revenue: 0, cashRevenue: 0, cardRevenue: 0, chequeRevenue: 0 }
  );

  const analytics = buildDashboardAnalytics({
    currentSales: input.sales,
    previousSales: input.previousSales,
    from: input.fromDate,
    to: input.toDate,
    periodLabel: input.periodLabel,
    previousPeriodLabel: input.previousPeriodLabel,
    scopeLabel: input.scopeLabel,
    storeMeta: input.storeMeta,
    stockAlerts: input.stockAlerts,
    totalUnits: input.totalUnits,
    catalogueSize: input.catalogueSize,
  });

  return {
    data: {
      periodLabel: input.periodLabel,
      generatedAt: formatDate(new Date().toISOString()),
      scopeLabel: input.scopeLabel,
      summary,
      sales: saleRows,
      stockMovements: stockRows,
      totals: {
        ...totals,
        averageTicket: totals.salesCount > 0 ? totals.revenue / totals.salesCount : 0,
      },
      analytics,
    },
  };
}

export async function fetchDashboardReport(input: {
  storeIds: string[];
  period: DashboardReportPeriod;
  scopeLabel?: string;
}): Promise<{ data: DashboardReportPayload } | { error: string }> {
  try {
    const profile = await requireRole(["directeur", "admin", "manager", "hub"]);
    if (!profile) return actionError("Non autorisé");

    const storesResult = await resolveAllowedStores(profile, input.storeIds);
    if ("error" in storesResult) return storesResult;
    const stores = storesResult;
    if (stores.length === 0) return actionError("Aucun magasin accessible");

    const storeIds = stores.map((s) => s.id);
    const storeById = new Map(stores.map((s) => [s.id, s]));
    const storeMeta = new Map(stores.map((s) => [s.id, { name: s.name, city: s.city }]));
    const { current, previous } = resolveAnalyticsPeriods(input.period);

    const supabase = await createClient();

    let salesQuery = supabase
      .from("sales")
      .select(SALE_HISTORY_SELECT)
      .in("store_id", storeIds)
      .lte("created_at", current.to.toISOString())
      .order("created_at", { ascending: false })
      .limit(SALES_LIMIT);

    if (current.from) {
      salesQuery = salesQuery.gte("created_at", current.from.toISOString());
    }

    let previousSalesQuery = previous
      ? supabase
          .from("sales")
          .select(SALE_HISTORY_SELECT)
          .in("store_id", storeIds)
          .lte("created_at", previous.to.toISOString())
          .order("created_at", { ascending: false })
          .limit(SALES_LIMIT)
      : null;

    if (previous?.from && previousSalesQuery) {
      previousSalesQuery = previousSalesQuery.gte("created_at", previous.from.toISOString());
    }

    let movementsQuery = supabase
      .from("stock_movements")
      .select(
        "id, quantity, type, notes, created_at, store_id, products(name), profiles:created_by(full_name, email)"
      )
      .in("store_id", storeIds)
      .in("type", ["add", "adjustment", "transfer"])
      .order("created_at", { ascending: false })
      .limit(MOVEMENTS_LIMIT);

    if (current.from) {
      movementsQuery = movementsQuery
        .gte("created_at", current.from.toISOString())
        .lte("created_at", current.to.toISOString());
    }

    const city = getCityFilter(profile);
    const storesWithStats = filterRetailStoresByProfile(
      await getStoresWithStats(city),
      profile
    ).filter((s) => storeIds.includes(s.id));

    const statsByStore = new Map(
      storesWithStats.map((s) => [
        s.id,
        { lowStockCount: s.lowStockCount, totalUnits: s.totalUnits },
      ])
    );

    const stockAlerts = storesWithStats.reduce((sum, s) => sum + s.lowStockCount, 0);
    const totalUnits = storesWithStats.reduce((sum, s) => sum + s.totalUnits, 0);
    const { count: catalogueSize } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const scopeLabel =
      input.scopeLabel ||
      (stores.length === 1
        ? `${stores[0].name} — ${stores[0].city}`
        : `${stores.length} magasins`);

    const payloadBase = {
      stores,
      storeById,
      storeMeta,
      statsByStore,
      periodLabel: current.label,
      previousPeriodLabel: previous?.label ?? "",
      scopeLabel,
      fromDate: current.from ?? new Date(0),
      toDate: current.to,
      stockAlerts,
      totalUnits,
      catalogueSize: catalogueSize || 0,
    };

    if (previousSalesQuery) {
      const [
        { data: salesRaw, error: salesError },
        { data: previousSalesRaw, error: prevSalesError },
        { data: movementsRaw, error: movError },
      ] = await Promise.all([salesQuery, previousSalesQuery, movementsQuery]);

      if (salesError) {
        console.error("[dashboard-report] sales:", salesError.message);
        return actionError(salesError.message);
      }
      if (prevSalesError) {
        console.error("[dashboard-report] previous sales:", prevSalesError.message);
        return actionError(prevSalesError.message);
      }
      if (movError) {
        console.error("[dashboard-report] movements:", movError.message);
        return actionError(movError.message);
      }

      return buildReportPayload({
        ...payloadBase,
        sales: (salesRaw || []) as Sale[],
        previousSales: (previousSalesRaw || []) as Sale[],
        movementsRaw: movementsRaw || [],
      });
    }

    const [{ data: salesRaw, error: salesError }, { data: movementsRaw, error: movError }] =
      await Promise.all([salesQuery, movementsQuery]);

    if (salesError) {
      console.error("[dashboard-report] sales:", salesError.message);
      return actionError(salesError.message);
    }
    if (movError) {
      console.error("[dashboard-report] movements:", movError.message);
      return actionError(movError.message);
    }

    return buildReportPayload({
      ...payloadBase,
      sales: (salesRaw || []) as Sale[],
      previousSales: null,
      movementsRaw: movementsRaw || [],
    });
  } catch (err) {
    console.error("[dashboard-report] fetchDashboardReport:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}
