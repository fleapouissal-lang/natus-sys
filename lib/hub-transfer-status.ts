import type { HubStockTransferStatus } from "@/lib/types";

const STATUS_LABELS: Record<HubStockTransferStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  pret: "Prête",
  en_livraison: "En livraison",
  livre: "Livré",
  sent: "Envoyé",
  received: "Reçu",
};

const STATUS_VARIANTS: Record<
  HubStockTransferStatus,
  "default" | "warning" | "success" | "danger"
> = {
  en_attente: "warning",
  en_cours: "default",
  pret: "warning",
  en_livraison: "warning",
  livre: "warning",
  sent: "warning",
  received: "success",
};

export function hubTransferStatusLabel(status: HubStockTransferStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function hubTransferStatusVariant(
  status: HubStockTransferStatus
): "default" | "warning" | "success" | "danger" {
  return STATUS_VARIANTS[status] ?? "default";
}

/** Le caissier peut valider la réception (stock magasin). */
export function hubTransferCashierCanValidate(status: HubStockTransferStatus): boolean {
  return status === "livre" || status === "sent";
}

/** Commandes visibles au magasin avant réception définitive. */
export function hubTransferVisibleAtStore(status: HubStockTransferStatus): boolean {
  return (
    status === "en_cours" ||
    status === "pret" ||
    status === "en_livraison" ||
    status === "livre" ||
    status === "sent"
  );
}

export function hubTransferDepotStockReserved(status: HubStockTransferStatus): boolean {
  return (
    status === "en_cours" ||
    status === "pret" ||
    status === "en_livraison" ||
    status === "livre" ||
    status === "sent"
  );
}

export function hubTransferStoreStatusHint(status: HubStockTransferStatus): string {
  switch (status) {
    case "en_attente":
      return "Commande créée — stock source non déduit tant qu'elle n'est pas confirmée";
    case "en_cours":
      return "Commande confirmée — stock déduit à la source";
    case "pret":
      return "Commande prête — en attente du livreur";
    case "en_livraison":
      return "En route depuis la source";
    case "livre":
      return "Livré — stock crédité à destination";
    case "received":
      return "Réception validée — transfert terminé";
    default:
      return "";
  }
}
