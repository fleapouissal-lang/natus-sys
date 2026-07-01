import type { HubStockTransfer, HubStockTransferStatus, StoreStockTransfer, StoreStockTransferStatus } from "@/lib/types";

type TransferStatus = HubStockTransferStatus | StoreStockTransferStatus;

const DIRECTOR_SENT_STATUSES = new Set<TransferStatus>([
  "pret",
  "en_livraison",
  "livre",
  "sent",
]);

/** Directeur — stocks envoyés : prêt → livré (hub : + sent), hors en cours et reçu. */
export function isDirectorTransferSentStatus(status: TransferStatus): boolean {
  return DIRECTOR_SENT_STATUSES.has(status);
}

/** Directeur — stocks reçus : uniquement les transferts clôturés (reçu). */
export function isDirectorTransferReceivedStatus(status: TransferStatus): boolean {
  return status === "received";
}

/** Stocks envoyés (autres rôles) : hors en cours et reçu. */
export function isTransferSentStatus(status: TransferStatus): boolean {
  return status !== "received" && status !== "en_cours" && status !== "en_attente";
}

/** Stocks reçus (autres rôles) : visible dès la création jusqu'à clôture. */
export function isTransferReceivedStatus(_status: TransferStatus): boolean {
  return true;
}

/** @deprecated Utiliser isDirectorTransferSentStatus ou isTransferSentStatus */
export function isDirectorTransferInProgress(status: TransferStatus): boolean {
  return isDirectorTransferSentStatus(status);
}

/** @deprecated Utiliser isDirectorTransferReceivedStatus */
export function isDirectorTransferReceived(status: TransferStatus): boolean {
  return isDirectorTransferReceivedStatus(status);
}

export function filterDirectorSentStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferSentStatus(transfer.status));
}

export function filterDirectorReceivedStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferReceivedStatus(transfer.status));
}

export function filterDirectorSentHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferSentStatus(transfer.status));
}

export function filterDirectorReceivedHubTransfers(
  transfers: HubStockTransfer[]
): HubStockTransfer[] {
  return transfers.filter((transfer) => isDirectorTransferReceivedStatus(transfer.status));
}

export function filterSentStoreTransfers(
  transfers: StoreStockTransfer[]
): StoreStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}

export function filterSentHubTransfers(transfers: HubStockTransfer[]): HubStockTransfer[] {
  return transfers.filter((transfer) => isTransferSentStatus(transfer.status));
}
