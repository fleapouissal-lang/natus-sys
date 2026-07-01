import type { HubStockTransfer, StoreStockTransfer } from "@/lib/types";
import {
  filterOutgoingHubTransfersFromStores,
  filterOutgoingStoreTransfersFromStores,
} from "@/lib/stock-transfers/role-transfer-filters";

export function buildManagerSourceHistoryGroups(
  storeTransfers: StoreStockTransfer[],
  hubOutgoingTransfers: HubStockTransfer[],
  managedStoreIds: string[]
) {
  return [
    {
      kind: "store" as const,
      typeLabel: "Vers magasin",
      storeTransfers: filterOutgoingStoreTransfersFromStores(
        storeTransfers,
        managedStoreIds
      ),
    },
    {
      kind: "depot" as const,
      typeLabel: "Vers dépôt",
      hubTransfers: filterOutgoingHubTransfersFromStores(
        hubOutgoingTransfers,
        managedStoreIds
      ),
    },
  ];
}

export function buildDirectorSourceHistoryGroups(
  storeTransfers: StoreStockTransfer[],
  hubTransfers: HubStockTransfer[],
  retailStoreIds: string[],
  hubStoreIds: string[]
) {
  const retailIds = new Set(retailStoreIds);
  const hubIds = new Set(hubStoreIds);

  const interStore = storeTransfers.filter((transfer) =>
    retailIds.has(transfer.from_store_id)
  );

  const hubHub = hubTransfers.filter(
    (transfer) =>
      transfer.from_store_is_hub &&
      transfer.to_store_is_hub &&
      hubIds.has(transfer.from_store_id)
  );

  const mixed = hubTransfers.filter(
    (transfer) =>
      (transfer.from_store_is_hub &&
        !transfer.to_store_is_hub &&
        hubIds.has(transfer.from_store_id)) ||
      (!transfer.from_store_is_hub &&
        transfer.to_store_is_hub &&
        retailIds.has(transfer.from_store_id))
  );

  return [
    {
      kind: "store" as const,
      typeLabel: "Inter-magasins",
      storeTransfers: interStore,
    },
    {
      kind: "hub" as const,
      typeLabel: "Entre Hubs",
      hubTransfers: hubHub,
    },
    {
      kind: "mixed" as const,
      typeLabel: "Hub ↔ Magasin",
      hubTransfers: mixed,
    },
  ];
}

export function buildHubSourceHistoryGroups(outgoingTransfers: HubStockTransfer[]) {
  return [
    {
      kind: "hub" as const,
      typeLabel: "Depuis dépôt",
      hubTransfers: outgoingTransfers.filter((transfer) => transfer.from_store_is_hub),
    },
  ];
}

export function buildCashierSourceHistoryGroups(
  interStoreTransfers: StoreStockTransfer[],
  storeToHubTransfers: HubStockTransfer[]
) {
  return [
    {
      kind: "store" as const,
      typeLabel: "Vers magasin",
      storeTransfers: interStoreTransfers,
    },
    {
      kind: "depot" as const,
      typeLabel: "Vers dépôt",
      hubTransfers: storeToHubTransfers,
    },
  ];
}
