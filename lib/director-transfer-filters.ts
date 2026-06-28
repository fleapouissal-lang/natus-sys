import type { HubStockTransfer, HubStockTransferStatus, StoreStockTransfer, StoreStockTransferStatus } from "@/lib/types";

type TransferStatus = HubStockTransferStatus | StoreStockTransferStatus;

/** Directeur : « Stocks reçus » = livré par le livreur ou réception validée. */
export function isDirectorTransferReceived(status: TransferStatus): boolean {
  return status === "livre" || status === "received";
}

/** Directeur : « Stocks envoyés » = tout transfert pas encore livré. */
export function isDirectorTransferInProgress(status: TransferStatus): boolean {
  return !isDirectorTransferReceived(status);
}

export function filterDirectorSentStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferInProgress(transfer.status));
}

export function filterDirectorReceivedStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferReceived(transfer.status));
}

export function filterDirectorSentHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferInProgress(transfer.status));
}

export function filterDirectorReceivedHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferReceived(transfer.status));
}
