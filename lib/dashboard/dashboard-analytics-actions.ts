"use server";

import { createClient } from "@/lib/supabase/server";
import { getStoresWithStats } from "@/lib/inventory";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import { buildDashboardAnalytics } from "@/lib/dashboard/compute-analytics";
import { resolveAllowedDashboardStores } from "@/lib/dashboard/dashboard-store-access";
import {
  resolveAnalyticsPeriods,
  type DashboardReportPeriod,
} from "@/lib/dashboard/report-period";
import type { DashboardAnalyticsPayload } from "@/lib/dashboard/analytics-types";
import type { Sale } from "@/lib/types";

const SALES_LIMIT = 15000;

function actionError(message: string): { error: string } {
  return { error: message };
}

async function fetchSalesForRange(
  storeIds: string[],
  from: Date | null,
  to: Date
): Promise<Sale[] | { error: string }> {
  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .in("store_id", storeIds)
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(SALES_LIMIT);

  if (from) {
    query = query.gte("created_at", from.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("[dashboard-analytics] sales:", error.message);
    return actionError(error.message);
  }

  return (data || []) as Sale[];
}

export async function fetchDashboardAnalytics(input: {
  storeIds: string[];
  period: DashboardReportPeriod;
  scopeLabel?: string;
}): Promise<{ data: DashboardAnalyticsPayload } | { error: string }> {
  try {
    const access = await resolveAllowedDashboardStores(input.storeIds);
    if ("error" in access) return access;

    const stores = access.stores;
    if (stores.length === 0) return actionError("Aucun magasin accessible");

    const storeIds = stores.map((s) => s.id);
    const storeMeta = new Map(stores.map((s) => [s.id, { name: s.name, city: s.city }]));
    const { current, previous } = resolveAnalyticsPeriods(input.period);

    const [currentSalesResult, previousSalesResult] = await Promise.all([
      fetchSalesForRange(storeIds, current.from, current.to),
      previous
        ? fetchSalesForRange(storeIds, previous.from, previous.to)
        : Promise.resolve(null),
    ]);

    if ("error" in currentSalesResult) return currentSalesResult;
    if (previousSalesResult && "error" in previousSalesResult) return previousSalesResult;

    const city = getCityFilter(access.profile);
    const storesWithStats = filterRetailStoresByProfile(
      await getStoresWithStats(city),
      access.profile
    ).filter((s) => storeIds.includes(s.id));

    const stockAlerts = storesWithStats.reduce((sum, s) => sum + s.lowStockCount, 0);
    const totalUnits = storesWithStats.reduce((sum, s) => sum + s.totalUnits, 0);
    const { count: catalogueSize } = await (await createClient())
      .from("products")
      .select("*", { count: "exact", head: true });

    const scopeLabel =
      input.scopeLabel ||
      (stores.length === 1
        ? `${stores[0].name} — ${stores[0].city}`
        : `${stores.length} magasins`);

    const fromDate = current.from ?? new Date(0);
    const data = buildDashboardAnalytics({
      currentSales: currentSalesResult,
      previousSales: previousSalesResult,
      from: fromDate,
      to: current.to,
      periodLabel: current.label,
      previousPeriodLabel: previous?.label ?? "",
      scopeLabel,
      storeMeta,
      stockAlerts,
      totalUnits,
      catalogueSize: catalogueSize || 0,
    });

    return { data };
  } catch (err) {
    console.error("[dashboard-analytics] fetchDashboardAnalytics:", err);
    return actionError(err instanceof Error ? err.message : "Erreur serveur");
  }
}
