import type { HubStockTransfer } from "@/lib/types";

export type HubTransferDirection = "depot_to_store" | "store_to_depot";

export function hubTransferDirection(
  transfer: Pick<HubStockTransfer, "from_store_is_hub" | "to_store_is_hub">
): HubTransferDirection {
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
  if (hubTransferDirection(transfer) === "store_to_depot") {
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
  return direction === "store_to_depot"
    ? "Récupérez le retour au magasin, livrez au dépôt"
    : "Prenez la commande au dépôt, livrez au magasin";
}

export function hubTransferValidationHint(
  direction: HubTransferDirection,
  status: HubStockTransfer["status"]
): string | null {
  if (status !== "livre") return null;
  return direction === "store_to_depot"
    ? "Livré — validation dépôt requise"
    : "Livré — validation caissier requise";
}
