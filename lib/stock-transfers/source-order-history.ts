import type { HubStockTransferStatus, StoreStockTransferStatus } from "@/lib/types";

/** Limite élevée pour le journal permanent des commandes source. */
export const SOURCE_ORDER_HISTORY_LIMIT = 500;

export function formatTransferOrderNumber(transferId: string): string {
  return transferId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

type SourceOrderStatus = HubStockTransferStatus | StoreStockTransferStatus | string;

/**
 * Journal permanent compte source : toute commande envoyée (hors « En attente »).
 * Inclut en cours, prêt, livré, reçu, etc.
 */
export function isTransferSourceOrderHistory(status: SourceOrderStatus): boolean {
  return status !== "en_attente";
}

export type TransferStatusTimelineStep = {
  status: string;
  label: string;
  at: string;
};

/** Reconstruit la chronologie des statuts à partir des horodatages enregistrés. */
export function buildTransferStatusTimeline(transfer: {
  status: string;
  sent_at: string;
  created_at?: string | null;
  ready_at?: string | null;
  shipped_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  received_at?: string | null;
}): TransferStatusTimelineStep[] {
  const steps: TransferStatusTimelineStep[] = [];

  if (transfer.created_at) {
    steps.push({ status: "created", label: "Commande créée", at: transfer.created_at });
  }

  if (transfer.sent_at && transfer.sent_at !== transfer.created_at) {
    steps.push({ status: "sent", label: "Envoi / passage en cours", at: transfer.sent_at });
  } else if (transfer.sent_at && !transfer.created_at) {
    steps.push({ status: "sent", label: "Commande envoyée", at: transfer.sent_at });
  }

  if (transfer.status === "en_cours" && transfer.sent_at) {
    const last = steps[steps.length - 1];
    if (!last || last.status !== "sent") {
      steps.push({ status: "en_cours", label: "En cours de préparation", at: transfer.sent_at });
    }
  }

  if (transfer.ready_at) {
    steps.push({ status: "pret", label: "Marquée prête", at: transfer.ready_at });
  }

  if (transfer.shipped_at) {
    steps.push({ status: "shipped", label: "Expédiée", at: transfer.shipped_at });
  }

  if (transfer.picked_up_at) {
    steps.push({ status: "en_livraison", label: "Prise en charge livreur", at: transfer.picked_up_at });
  }

  if (transfer.delivered_at) {
    steps.push({ status: "livre", label: "Livrée", at: transfer.delivered_at });
  }

  if (transfer.received_at) {
    steps.push({ status: "received", label: "Réception validée", at: transfer.received_at });
  }

  return steps.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
