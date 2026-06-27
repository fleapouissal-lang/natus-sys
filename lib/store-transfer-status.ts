import type { StoreStockTransferStatus } from "@/lib/types";

const STATUS_LABELS: Record<StoreStockTransferStatus, string> = {
  en_cours: "En cours",
  pret: "Prête",
  en_livraison: "En livraison",
  livre: "Livré — à valider",
  received: "Reçu",
};

const STATUS_VARIANTS: Record<
  StoreStockTransferStatus,
  "default" | "warning" | "success" | "danger"
> = {
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
    case "en_cours":
      return "À préparer au magasin source";
    case "pret":
      return "Prête — assigner un livreur puis remettre le colis";
    case "en_livraison":
      return "Colis remis au livreur — stock déduit au magasin source";
    case "livre":
      return "Livré — en attente de validation destination";
    case "received":
      return "Transfert terminé";
    default:
      return "";
  }
}

export function storeTransferDestinationHint(status: StoreStockTransferStatus): string {
  switch (status) {
    case "en_cours":
      return "Commande en préparation";
    case "pret":
      return "En attente d'expédition depuis le magasin source";
    case "en_livraison":
      return "En route — le livreur marquera livré à destination";
    case "livre":
      return "Valider la réception pour créditer le stock";
    case "received":
      return "Stock crédité au magasin";
    default:
      return "";
  }
}
