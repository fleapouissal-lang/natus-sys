import { createClient } from "@/lib/supabase/server";
import { getHubDepotTransfersForOperator } from "@/lib/hub-transfers";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import type { StoreWithStats } from "@/lib/types";
import type { HubStockTransfer, Profile } from "@/lib/types";

export type HubStoreRiskRow = {
  storeId: string;
  storeName: string;
  city: string;
  lowStockCount: number;
  totalUnits: number;
  outOfStockCount: number;
};

export type HubTopProductRow = {
  productId: string;
  productName: string;
  units: number;
  transfers: number;
};

export type HubStoreFlowRow = {
  storeId: string;
  storeName: string;
  city: string | null;
  outgoingUnits: number;
  outgoingCount: number;
};

export type HubStatusBreakdownRow = {
  status: HubStockTransfer["status"];
  count: number;
};

export type HubDashboardAnalytics = {
  periodDays: number;
  outgoingCount: number;
  outgoingUnits: number;
  incomingCount: number;
  incomingUnits: number;
  avgUnitsPerOutgoing: number;
  completedOutgoingCount: number;
  openOutgoingCount: number;
  fulfillmentRate: number;
  hubSkuCount: number;
  networkUnits: number;
  statusBreakdown: HubStatusBreakdownRow[];
  topProducts: HubTopProductRow[];
  storeFlow: HubStoreFlowRow[];
};

export type HubDashboardStats = {
  assignedStoresCount: number;
  hubDepotUnits: number;
  hubLowStockCount: number;
  hubOutOfStockCount: number;
  networkLowStockCount: number;
  networkOutOfStockCount: number;
  outgoingInProgressCount: number;
  incomingPendingCount: number;
  pendingWriteoffsCount: number;
  recentOutgoing: HubStockTransfer[];
  recentIncoming: HubStockTransfer[];
  storesAtRisk: HubStoreRiskRow[];
  analytics: HubDashboardAnalytics;
};

const ANALYTICS_PERIOD_DAYS = 30;

function isTransferOpen(status: HubStockTransfer["status"]): boolean {
  return status !== "received";
}

/** Analyses transferts limitées au dépôt et à ses magasins assignés (30 derniers jours). */
function buildHubAnalytics(input: {
  transfers: HubStockTransfer[];
  hubStoreStats: StoreWithStats | null;
  retailStoresWithStats: StoreWithStats[];
}): HubDashboardAnalytics {
  const { transfers, hubStoreStats, retailStoresWithStats } = input;

  const periodStart = Date.now() - ANALYTICS_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const inPeriod = (transfer: HubStockTransfer) => {
    const sentAt = transfer.sent_at ? new Date(transfer.sent_at).getTime() : 0;
    return sentAt >= periodStart;
  };

  // Envois dépôt → magasin retail
  const outgoing = transfers.filter(
    (transfer) =>
      transfer.from_store_is_hub && !transfer.to_store_is_hub && inPeriod(transfer)
  );
  // Réceptions magasin → dépôt
  const incoming = transfers.filter(
    (transfer) =>
      transfer.to_store_is_hub && !transfer.from_store_is_hub && inPeriod(transfer)
  );

  const outgoingUnits = outgoing.reduce((sum, t) => sum + t.total_units, 0);
  const incomingUnits = incoming.reduce((sum, t) => sum + t.total_units, 0);
  const completedOutgoingCount = outgoing.filter((t) => t.status === "received").length;
  const openOutgoingCount = outgoing.filter((t) => isTransferOpen(t.status)).length;

  const statusCounts = new Map<HubStockTransfer["status"], number>();
  for (const transfer of outgoing) {
    statusCounts.set(transfer.status, (statusCounts.get(transfer.status) ?? 0) + 1);
  }
  const statusBreakdown: HubStatusBreakdownRow[] = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Top produits transférés depuis le dépôt
  const productMap = new Map<string, HubTopProductRow>();
  for (const transfer of outgoing) {
    for (const item of transfer.items) {
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.units += item.quantity;
        existing.transfers += 1;
      } else {
        productMap.set(item.product_id, {
          productId: item.product_id,
          productName: item.product_name,
          units: item.quantity,
          transfers: 1,
        });
      }
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  // Flux par magasin (volume reçu depuis le dépôt)
  const storeMap = new Map<string, HubStoreFlowRow>();
  for (const transfer of outgoing) {
    const existing = storeMap.get(transfer.to_store_id);
    if (existing) {
      existing.outgoingUnits += transfer.total_units;
      existing.outgoingCount += 1;
    } else {
      storeMap.set(transfer.to_store_id, {
        storeId: transfer.to_store_id,
        storeName: transfer.to_store_name || "Magasin",
        city: transfer.to_store_city ?? null,
        outgoingUnits: transfer.total_units,
        outgoingCount: 1,
      });
    }
  }
  const storeFlow = Array.from(storeMap.values())
    .sort((a, b) => b.outgoingUnits - a.outgoingUnits)
    .slice(0, 8);

  const networkUnits = retailStoresWithStats.reduce((sum, store) => sum + store.totalUnits, 0);

  return {
    periodDays: ANALYTICS_PERIOD_DAYS,
    outgoingCount: outgoing.length,
    outgoingUnits,
    incomingCount: incoming.length,
    incomingUnits,
    avgUnitsPerOutgoing: outgoing.length > 0 ? Math.round(outgoingUnits / outgoing.length) : 0,
    completedOutgoingCount,
    openOutgoingCount,
    fulfillmentRate:
      outgoing.length > 0 ? Math.round((completedOutgoingCount / outgoing.length) * 100) : 0,
    hubSkuCount: hubStoreStats?.productCount ?? 0,
    networkUnits,
    statusBreakdown,
    topProducts,
    storeFlow,
  };
}

async function countOutOfStockForStores(storeIds: string[]): Promise<Record<string, number>> {
  if (storeIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_inventory")
    .select("store_id, stock")
    .in("store_id", storeIds);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const storeId of storeIds) {
    counts[storeId] = 0;
  }
  for (const row of data) {
    if (row.stock <= 0) {
      counts[row.store_id] = (counts[row.store_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getHubDashboardStats(input: {
  profile: Profile;
  hubStoreId: string | null;
  hubStoreIds: string[];
  assignedStoreIds: string[];
  retailStoresWithStats: StoreWithStats[];
  hubStoreStats: StoreWithStats | null;
}): Promise<HubDashboardStats> {
  const {
    profile,
    hubStoreId,
    hubStoreIds,
    assignedStoreIds,
    retailStoresWithStats,
    hubStoreStats,
  } = input;

  const storeIdsForOutOfStock = [
    ...(hubStoreId ? [hubStoreId] : []),
    ...retailStoresWithStats.map((store) => store.id),
  ];

  const [transfers, pendingWriteoffs, outOfStockMap] = await Promise.all([
    hubStoreIds.length > 0 || assignedStoreIds.length > 0
      ? getHubDepotTransfersForOperator({ hubStoreIds, assignedStoreIds })
      : Promise.resolve([] as HubStockTransfer[]),
    hubStoreId
      ? getStoreProductWriteoffs(profile, {
          status: "pending",
          storeIds: [hubStoreId],
          limit: 50,
        })
      : Promise.resolve([]),
    countOutOfStockForStores(storeIdsForOutOfStock),
  ]);

  const outgoing = transfers.filter(
    (transfer) => transfer.from_store_is_hub && isTransferOpen(transfer.status)
  );
  const incoming = transfers.filter(
    (transfer) =>
      transfer.to_store_is_hub &&
      !transfer.from_store_is_hub &&
      isTransferOpen(transfer.status)
  );

  const networkLowStockCount = retailStoresWithStats.reduce(
    (sum, store) => sum + store.lowStockCount,
    0
  );

  const networkOutOfStockCount = retailStoresWithStats.reduce(
    (sum, store) => sum + (outOfStockMap[store.id] ?? 0),
    0
  );

  const storesAtRisk = retailStoresWithStats
    .map((store) => ({
      storeId: store.id,
      storeName: store.name,
      city: store.city,
      lowStockCount: store.lowStockCount,
      totalUnits: store.totalUnits,
      outOfStockCount: outOfStockMap[store.id] ?? 0,
    }))
    .filter((row) => row.lowStockCount > 0 || row.outOfStockCount > 0)
    .sort((a, b) => {
      if (b.outOfStockCount !== a.outOfStockCount) {
        return b.outOfStockCount - a.outOfStockCount;
      }
      return b.lowStockCount - a.lowStockCount;
    })
    .slice(0, 8);

  return {
    assignedStoresCount: retailStoresWithStats.length,
    hubDepotUnits: hubStoreStats?.totalUnits ?? 0,
    hubLowStockCount: hubStoreStats?.lowStockCount ?? 0,
    hubOutOfStockCount: hubStoreId ? outOfStockMap[hubStoreId] ?? 0 : 0,
    networkLowStockCount,
    networkOutOfStockCount,
    outgoingInProgressCount: outgoing.length,
    incomingPendingCount: incoming.length,
    pendingWriteoffsCount: pendingWriteoffs.length,
    recentOutgoing: outgoing.slice(0, 6),
    recentIncoming: incoming.slice(0, 6),
    storesAtRisk,
    analytics: buildHubAnalytics({
      transfers,
      hubStoreStats,
      retailStoresWithStats,
    }),
  };
}
