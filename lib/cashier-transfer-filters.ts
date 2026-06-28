import type { HubStockTransfer, StoreStockTransfer } from "@/lib/types";

/** Transferts inter-magasins envoyés depuis le magasin du caissier. */
export function filterCashierOutgoingInterStore(
  transfers: StoreStockTransfer[],
  storeId: string
): StoreStockTransfer[] {
  return transfers.filter(
    (transfer) =>
      transfer.from_store_id === storeId && transfer.to_store_id !== storeId
  );
}

/** Transferts inter-magasins reçus par le magasin du caissier. */
export function filterCashierIncomingInterStore(
  transfers: StoreStockTransfer[],
  storeId: string
): StoreStockTransfer[] {
  return transfers.filter(
    (transfer) =>
      transfer.to_store_id === storeId && transfer.from_store_id !== storeId
  );
}

/** Transferts magasin → dépôt hub envoyés par le magasin du caissier. */
export function filterCashierOutgoingStoreToHub(
  transfers: HubStockTransfer[],
  storeId: string
): HubStockTransfer[] {
  return transfers.filter(
    (transfer) =>
      transfer.from_store_id === storeId &&
      transfer.to_store_is_hub &&
      !transfer.from_store_is_hub
  );
}

/** Transferts hub → magasin reçus par le magasin du caissier. */
export function filterCashierIncomingHubToStore(
  transfers: HubStockTransfer[],
  storeId: string,
  hubStoreIds: string[] = []
): HubStockTransfer[] {
  const hubIds = new Set(hubStoreIds);
  return transfers.filter(
    (transfer) =>
      transfer.to_store_id === storeId &&
      !transfer.to_store_is_hub &&
      (transfer.from_store_is_hub || hubIds.has(transfer.from_store_id))
  );
}
