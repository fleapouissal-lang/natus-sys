import type { HubStockTransferStatus, StoreStockTransferStatus } from "@/lib/types";

export type TransferWorkflowSplit = "pending" | "sent" | "sent-source" | "history";

type TransferStatus = HubStockTransferStatus | StoreStockTransferStatus | string;

/** En préparation — visible uniquement dans « Mes commandes ». */
export function isTransferPendingPreparation(status: TransferStatus): boolean {
  return status === "en_cours";
}

/** Préparé, expédié ou en livraison — visible dans « Stock envoyé » (hors reçu et en cours). */
export function isTransferSentStockWorkflow(status: TransferStatus): boolean {
  return status !== "en_cours" && status !== "received";
}

/**
 * Stock envoyé côté source (gérant / caisse / hub) : inclut « En cours » pour marquer prête,
 * plus les statuts expédiés. Exclut uniquement « Reçu ».
 */
export function isTransferSentSourceWorkflow(status: TransferStatus): boolean {
  return status !== "received";
}

/** Historique compte source : toute commande expédiée ou clôturée (hors en cours). */
export function isTransferSourceHistoryWorkflow(status: TransferStatus): boolean {
  return status !== "en_cours";
}

export function filterTransfersByWorkflowSplit<T extends { status: TransferStatus }>(
  transfers: T[],
  split: TransferWorkflowSplit
): T[] {
  return transfers.filter((transfer) => {
    if (split === "pending") return isTransferPendingPreparation(transfer.status);
    if (split === "history") return isTransferSourceHistoryWorkflow(transfer.status);
    if (split === "sent-source") return isTransferSentSourceWorkflow(transfer.status);
    return isTransferSentStockWorkflow(transfer.status);
  });
}
