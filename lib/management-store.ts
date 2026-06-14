import type { Store } from "@/lib/types";

export function resolveSelectedStoreId(
  stores: Store[],
  storeParam?: string | null
): string {
  if (storeParam && stores.some((s) => s.id === storeParam)) {
    return storeParam;
  }
  return stores[0]?.id || "";
}

export function getSelectedStore(
  stores: Store[],
  storeId: string
): Store | undefined {
  return stores.find((s) => s.id === storeId);
}
