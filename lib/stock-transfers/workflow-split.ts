import type { HubStockTransferStatus, StoreStockTransferStatus } from "@/lib/types";

export type TransferWorkflowSplit =
  | "pending-attente"
  | "pending-cours"
  | "sent"
  | "sent-source"
  | "sent-no-pending"
  | "history";

/** @deprecated Utiliser pending-attente ou pending-cours */
export type TransferWorkflowSplitLegacy = "pending";

type TransferStatus = HubStockTransferStatus | StoreStockTransferStatus | string;

/** Commande directeur — en attente de confirmation hub/caisse. */
export function isTransferAwaitingConfirmation(status: TransferStatus): boolean {
  return status === "en_attente";
}

/** En préparation — visible dans « Mes commandes » gérant. */
export function isTransferPendingPreparation(status: TransferStatus): boolean {
  return status === "en_cours";
}

/** Préparé, expédié ou en livraison — visible dans « Stock envoyé » (hors reçu, en attente et en cours). */
export function isTransferSentStockWorkflow(status: TransferStatus): boolean {
  return (
    status !== "en_attente" && status !== "en_cours" && status !== "received"
  );
}

/**
 * Stock envoyé côté source (gérant / caisse / hub) : inclut « En cours » pour marquer prête,
 * plus les statuts expédiés. Exclut « En attente » et « Reçu ».
 */
export function isTransferSentSourceWorkflow(status: TransferStatus): boolean {
  return status !== "en_attente" && status !== "received";
}

/**
 * Stock envoyé gérant : tout sauf « En cours » et « En attente ».
 */
export function isTransferSentNoPendingWorkflow(status: TransferStatus): boolean {
  return status !== "en_attente" && status !== "en_cours";
}

/** Historique compte source : journal permanent (hors commandes encore « En attente »). */
export function isTransferSourceHistoryWorkflow(status: TransferStatus): boolean {
  return status !== "en_attente";
}

export function filterTransfersByWorkflowSplit<T extends { status: TransferStatus }>(
  transfers: T[],
  split: TransferWorkflowSplit | "pending"
): T[] {
  return transfers.filter((transfer) => {
    if (split === "pending" || split === "pending-attente") {
      return isTransferAwaitingConfirmation(transfer.status);
    }
    if (split === "pending-cours") return isTransferPendingPreparation(transfer.status);
    if (split === "history") return isTransferSourceHistoryWorkflow(transfer.status);
    if (split === "sent-source") return isTransferSentSourceWorkflow(transfer.status);
    if (split === "sent-no-pending") return isTransferSentNoPendingWorkflow(transfer.status);
    return isTransferSentStockWorkflow(transfer.status);
  });
}
