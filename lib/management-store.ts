import type { Profile, Store } from "@/lib/types";
import { isStoreScopedManager } from "@/lib/user-page-access";

export function getProfileLockedStoreId(
  profile: Pick<Profile, "role" | "store_id"> | null | undefined
): string | null {
  if (!profile || !isStoreScopedManager(profile) || !profile.store_id) return null;
  return profile.store_id;
}

export function resolveSelectedStoreId(
  stores: Store[],
  storeParam?: string | null,
  lockedStoreId?: string | null
): string {
  if (lockedStoreId && stores.some((s) => s.id === lockedStoreId)) {
    return lockedStoreId;
  }
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
