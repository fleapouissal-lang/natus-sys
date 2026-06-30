import type { HubStockTransfer, StoreStockTransfer } from "@/lib/types";

export function formatTransferSiteLabel(
  name: string | null | undefined,
  options: { isHub?: boolean; city?: string | null } = {}
): string {
  if (!name?.trim()) return "—";
  const type = options.isHub ? "Dépôt" : "Magasin";
  const city = options.city?.trim();
  return city ? `${type} ${name.trim()} · ${city}` : `${type} ${name.trim()}`;
}

export function hubTransferRouteLabels(
  transfer: Pick<
    HubStockTransfer,
    | "from_store_name"
    | "to_store_name"
    | "from_store_city"
    | "to_store_city"
    | "from_store_is_hub"
    | "to_store_is_hub"
  >
): { source: string; destination: string } {
  return {
    source: formatTransferSiteLabel(transfer.from_store_name, {
      isHub: transfer.from_store_is_hub,
      city: transfer.from_store_city,
    }),
    destination: formatTransferSiteLabel(transfer.to_store_name, {
      isHub: transfer.to_store_is_hub,
      city: transfer.to_store_city,
    }),
  };
}

export function storeTransferRouteLabels(
  transfer: Pick<
    StoreStockTransfer,
    "from_store_name" | "to_store_name" | "from_store_city" | "to_store_city"
  >
): { source: string; destination: string } {
  return {
    source: formatTransferSiteLabel(transfer.from_store_name, {
      city: transfer.from_store_city,
    }),
    destination: formatTransferSiteLabel(transfer.to_store_name, {
      city: transfer.to_store_city,
    }),
  };
}

export function formatTransferRouteLine(
  source: string,
  destination: string
): string {
  return `${source} → ${destination}`;
}
