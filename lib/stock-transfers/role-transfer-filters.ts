import type { HubStockTransfer, StoreStockTransfer } from "@/lib/types";

/** Gérant / caissier — envois depuis les magasins sources (tous statuts). */
export function filterOutgoingStoreTransfersFromStores(
  transfers: StoreStockTransfer[],
  fromStoreIds: string[]
): StoreStockTransfer[] {
  const ids = new Set(fromStoreIds);
  return transfers.filter(
    (transfer) =>
      ids.has(transfer.from_store_id) && transfer.from_store_id !== transfer.to_store_id
  );
}

/** Gérant — réceptions vers les magasins associés (tous statuts). */
export function filterIncomingStoreTransfersToStores(
  transfers: StoreStockTransfer[],
  toStoreIds: string[]
): StoreStockTransfer[] {
  const ids = new Set(toStoreIds);
  return transfers.filter(
    (transfer) =>
      ids.has(transfer.to_store_id) && transfer.from_store_id !== transfer.to_store_id
  );
}

/** Hub — envois dont la source est le dépôt (tous statuts). */
export function filterHubOutgoingFromHubs(
  transfers: HubStockTransfer[],
  hubStoreIds: string[]
): HubStockTransfer[] {
  const ids = new Set(hubStoreIds);
  return transfers.filter(
    (transfer) => ids.has(transfer.from_store_id) && transfer.from_store_is_hub
  );
}

/** Hub — réceptions dont la destination est le dépôt (tous statuts). */
export function filterHubIncomingToHubs(
  transfers: HubStockTransfer[],
  hubStoreIds: string[]
): HubStockTransfer[] {
  const ids = new Set(hubStoreIds);
  return transfers.filter(
    (transfer) => ids.has(transfer.to_store_id) && transfer.to_store_is_hub
  );
}

/** Gérant — réceptions dépôt → magasins associés (tous statuts). */
export function filterIncomingHubTransfersToStores(
  transfers: HubStockTransfer[],
  toStoreIds: string[]
): HubStockTransfer[] {
  const ids = new Set(toStoreIds);
  return transfers.filter((transfer) => ids.has(transfer.to_store_id));
}

/** Gérant — envois magasin → dépôt depuis les magasins sources. */
export function filterOutgoingHubTransfersFromStores(
  transfers: HubStockTransfer[],
  fromStoreIds: string[]
): HubStockTransfer[] {
  const ids = new Set(fromStoreIds);
  return transfers.filter((transfer) => ids.has(transfer.from_store_id));
}
