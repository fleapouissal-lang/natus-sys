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
};

function isTransferOpen(status: HubStockTransfer["status"]): boolean {
  return status !== "received";
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
  };
}
