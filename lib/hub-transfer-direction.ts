import type { HubStockTransfer } from "@/lib/types";

export type HubTransferDirection = "depot_to_store" | "store_to_depot" | "hub_to_hub";

export function hubTransferDirection(
  transfer: Pick<HubStockTransfer, "from_store_is_hub" | "to_store_is_hub">
): HubTransferDirection {
  if (transfer.from_store_is_hub && transfer.to_store_is_hub) return "hub_to_hub";
  if (transfer.to_store_is_hub) return "store_to_depot";
  return "depot_to_store";
}

export function hubTransferDirectionLabel(
  transfer: Pick<
    HubStockTransfer,
    "from_store_name" | "to_store_name" | "from_store_is_hub" | "to_store_is_hub"
  > & {
    from_store_city?: string | null;
    to_store_city?: string | null;
  }
): string {
  const direction = hubTransferDirection(transfer);

  if (direction === "hub_to_hub") {
    const destCity =
      transfer.to_store_city && transfer.from_store_city &&
      transfer.to_store_city !== transfer.from_store_city
        ? ` · ${transfer.to_store_city}`
        : "";
    return `Entre dépôts — ${transfer.from_store_name || "source"} → ${transfer.to_store_name || "destination"}${destCity}`;
  }

  if (direction === "store_to_depot") {
    const cityNote =
      transfer.from_store_city && transfer.to_store_city &&
      transfer.from_store_city !== transfer.to_store_city
        ? ` (${transfer.from_store_city})`
        : "";
    return `Retour dépôt depuis ${transfer.from_store_name || "magasin"}${cityNote}`;
  }

  const cityNote =
    transfer.to_store_city && transfer.from_store_city &&
    transfer.to_store_city !== transfer.from_store_city
      ? ` · ${transfer.to_store_city}`
      : "";
  return `Vers ${transfer.to_store_name || "magasin"}${cityNote}`;
}

export function hubTransferPickupHint(direction: HubTransferDirection): string {
  if (direction === "hub_to_hub") {
    return "Prenez la commande au dépôt source, livrez au dépôt destination";
  }
  return direction === "store_to_depot"
    ? "Récupérez le retour au magasin, livrez au dépôt"
    : "Prenez la commande au dépôt, livrez au magasin";
}

export function hubTransferValidationHint(
  direction: HubTransferDirection,
  status: HubStockTransfer["status"]
): string | null {
  if (status !== "livre") return null;
  if (direction === "hub_to_hub") return "Livré — validation dépôt destination requise";
  return direction === "store_to_depot"
    ? "Livré — validation dépôt requise"
    : "Livré — validation caissier requise";
}

/** Transferts hub dont le hub source gère prêt + assignation livreur. */
export function hubTransferManagedFromSourceHub(
  direction: HubTransferDirection,
  hubManageAsStoreSource: boolean
): boolean {
  if (hubManageAsStoreSource) return direction === "store_to_depot";
  return direction === "depot_to_store" || direction === "hub_to_hub";
}
