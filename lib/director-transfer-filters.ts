import type { HubStockTransfer, HubStockTransferStatus, StoreStockTransfer, StoreStockTransferStatus } from "@/lib/types";

type TransferStatus = HubStockTransferStatus | StoreStockTransferStatus;

/** Stocks envoyés : masquer uniquement les transferts clôturés (reçus). */
export function isTransferSentStatus(status: TransferStatus): boolean {
  return status !== "received";
}

/** Stocks reçus : visible dès la création (En cours) jusqu'à clôture. */
export function isTransferReceivedStatus(_status: TransferStatus): boolean {
  return true;
}

/** @deprecated Utiliser isTransferSentStatus */
export function isDirectorTransferInProgress(status: TransferStatus): boolean {
  return isTransferSentStatus(status);
}

/** @deprecated Utiliser isTransferReceivedStatus */
export function isDirectorTransferReceived(status: TransferStatus): boolean {
  return isTransferReceivedStatus(status);
}

export function filterDirectorSentStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}

export function filterDirectorReceivedStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isTransferReceivedStatus(transfer.status));
}

export function filterDirectorSentHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}

export function filterDirectorReceivedHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isTransferReceivedStatus(transfer.status));
}

export function filterSentStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}

export function filterSentHubTransfers(transfers: HubStockTransfer[]): HubStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}
