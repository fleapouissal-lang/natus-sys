import { isDateInRange } from "@/lib/store-tracking-period";
import type { StoreOverviewRow, StoreSnapshot } from "@/lib/types";

export type StoreTrackingPeriodRow = {
  storeId: string;
  storeName: string;
  periodRevenue: number;
  periodSales: number;
  periodCashRevenue: number;
  periodCardRevenue: number;
  periodStockActions: number;
  lowStockCount: number;
  totalUnits: number;
};

export function filterStoreSnapshot(
  snapshot: StoreSnapshot,
  from: Date,
  to: Date
): StoreSnapshot {
  return {
    ...snapshot,
    recentSales: snapshot.recentSales.filter((s) =>
      isDateInRange(s.created_at, from, to)
    ),
    recentStockAdds: snapshot.recentStockAdds.filter((m) =>
      isDateInRange(m.created_at, from, to)
    ),
  };
}

export function buildStoreTrackingRows(
  snapshots: StoreSnapshot[],
  overviewByStore: Record<string, StoreOverviewRow>,
  from: Date,
  to: Date
): StoreTrackingPeriodRow[] {
  return snapshots.map((snapshot) => {
    const filtered = filterStoreSnapshot(snapshot, from, to);
    const overview = overviewByStore[snapshot.storeId];

    const periodRevenue = filtered.recentSales.reduce((sum, s) => sum + s.total, 0);
    const periodCashRevenue = filtered.recentSales
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + s.total, 0);
    const periodCardRevenue = filtered.recentSales
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + s.total, 0);

    return {
      storeId: snapshot.storeId,
      storeName: snapshot.storeName,
      periodRevenue,
      periodSales: filtered.recentSales.length,
      periodCashRevenue,
      periodCardRevenue,
      periodStockActions: filtered.recentStockAdds.length,
      lowStockCount: overview?.lowStockCount ?? 0,
      totalUnits: overview?.totalUnits ?? 0,
    };
  });
}
