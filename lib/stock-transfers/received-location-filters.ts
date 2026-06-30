import type { Store } from "@/lib/types";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";

export type ReceivedTransferLocationOption = {
  value: string;
  label: string;
};

export type ReceivedTransferLocationSites = Pick<Store, "id" | "name" | "city" | "is_hub">;

export function formatReceivedTransferLocationLabel(
  site: ReceivedTransferLocationSites
): string {
  if (site.is_hub) {
    return `${site.name} (dépôt)`;
  }
  return site.city ? `${site.name} — ${site.city}` : site.name;
}

export function storesToLocationOptions(
  sites: ReceivedTransferLocationSites[]
): ReceivedTransferLocationOption[] {
  return [...sites]
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((site) => ({
      value: site.id,
      label: formatReceivedTransferLocationLabel(site),
    }));
}

export function mergeLocationOptionsFromRows(
  baseOptions: ReceivedTransferLocationOption[],
  rows: ReceivedTransferRow[],
  side: "source" | "destination"
): ReceivedTransferLocationOption[] {
  const byId = new Map(baseOptions.map((option) => [option.value, option]));

  for (const row of rows) {
    const id =
      side === "source" ? row.transfer.from_store_id : row.transfer.to_store_id;
    const name =
      side === "source"
        ? row.transfer.from_store_name
        : row.transfer.to_store_name;

    if (!id || byId.has(id)) continue;
    byId.set(id, {
      value: id,
      label: name?.trim() || "—",
    });
  }

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function withAllLocationOption(
  options: ReceivedTransferLocationOption[],
  allLabel: string
): ReceivedTransferLocationOption[] {
  return [{ value: "", label: allLabel }, ...options];
}

export function filterReceivedTransferRowsByLocation(
  rows: ReceivedTransferRow[],
  sourceStoreId: string,
  destStoreId: string
): ReceivedTransferRow[] {
  let result = rows;

  if (sourceStoreId) {
    result = result.filter((row) => row.transfer.from_store_id === sourceStoreId);
  }

  if (destStoreId) {
    result = result.filter((row) => row.transfer.to_store_id === destStoreId);
  }

  return result;
}
