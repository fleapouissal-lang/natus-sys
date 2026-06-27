import { getHubAssignedStores } from "@/lib/hub";
import { getActiveStores } from "@/lib/inventory";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { requireRole } from "@/lib/auth";
import type { Store } from "@/lib/types";

function actionError(message: string): { error: string } {
  return { error: message };
}

export async function resolveAllowedDashboardStores(
  requestedStoreIds: string[]
): Promise<
  | { stores: Store[]; profile: NonNullable<Awaited<ReturnType<typeof requireRole>>> }
  | { error: string }
> {
  const profile = await requireRole(["directeur", "admin", "manager", "hub"]);
  if (!profile) return actionError("Non autorisé");

  let stores: Store[] = [];

  if (profile.role === "hub") {
    stores = await getHubAssignedStores(profile.id);
  } else {
    const city = getCityFilter(profile);
    const all = await getActiveStores(city);
    stores = filterRetailStoresByProfile(all, profile);
  }

  if (requestedStoreIds.length === 0) {
    return { stores, profile };
  }

  const allowedIds = new Set(stores.map((s) => s.id));
  const filtered = requestedStoreIds.filter((id) => allowedIds.has(id));
  if (filtered.length === 0) {
    return actionError("Magasin non autorisé");
  }

  return { stores: stores.filter((s) => filtered.includes(s.id)), profile };
}
