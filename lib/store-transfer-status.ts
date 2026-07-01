import type { StoreStockTransferStatus } from "@/lib/types";

const STATUS_LABELS: Record<StoreStockTransferStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  pret: "Prête",
  en_livraison: "En livraison",
  livre: "Livré",
  received: "Reçu",
};

const STATUS_VARIANTS: Record<
  StoreStockTransferStatus,
  "default" | "warning" | "success" | "danger"
> = {
  en_attente: "warning",
  en_cours: "default",
  pret: "warning",
  en_livraison: "warning",
  livre: "warning",
  received: "success",
};

export function storeTransferStatusLabel(status: StoreStockTransferStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function storeTransferStatusVariant(
  status: StoreStockTransferStatus
): "default" | "warning" | "success" | "danger" {
  return STATUS_VARIANTS[status] ?? "default";
}

export function storeTransferSourceHint(status: StoreStockTransferStatus): string {
  switch (status) {
    case "en_attente":
      return "Commande créée — stock source non déduit tant qu'elle n'est pas confirmée";
    case "en_cours":
      return "Commande confirmée — stock déduit au magasin source";
    case "pret":
      return "Prête — assigner un livreur puis remettre le colis";
    case "en_livraison":
      return "Colis remis au livreur — en route vers la destination";
    case "livre":
      return "Livré — stock crédité à destination";
    case "received":
      return "Réception validée — transfert terminé";
    default:
      return "";
  }
}

export function storeTransferDestinationHint(status: StoreStockTransferStatus): string {
  switch (status) {
    case "en_attente":
      return "Commande créée — stock source non déduit tant qu'elle n'est pas confirmée";
    case "en_cours":
      return "Commande confirmée — stock source déduit, en préparation";
    case "pret":
      return "En attente d'expédition depuis le magasin source";
    case "en_livraison":
      return "En route — le livreur marquera livré à destination";
    case "livre":
      return "Livré — stock crédité, validation réception possible";
    case "received":
      return "Réception validée — transfert terminé";
    default:
      return "";
  }
}
