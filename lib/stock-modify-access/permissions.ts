import type { Profile, Store } from "@/lib/types";
import { getActiveStockModifyGrant } from "@/lib/stock-modify-access/queries";
import { isDirector, isHub, isManager, canModifyStock as baseCanModifyStock, canEditStockTotal as baseCanEditStockTotal } from "@/lib/permissions";

export async function resolveStockPermissions(
  profile: Profile,
  store: Pick<Store, "id" | "is_hub"> | null | undefined
): Promise<{ canModifyStock: boolean; canEditTotal: boolean; grantRequestId: string | null }> {
  if (!store) {
    return { canModifyStock: false, canEditTotal: false, grantRequestId: null };
  }

  if (isDirector(profile)) {
    return { canModifyStock: true, canEditTotal: true, grantRequestId: null };
  }

  const grant = await getActiveStockModifyGrant(profile, store.id);

  if (isManager(profile)) {
    return {
      canModifyStock: Boolean(grant),
      canEditTotal: Boolean(grant),
      grantRequestId: grant?.requestId ?? null,
    };
  }

  if (isHub(profile)) {
    const baseModify = baseCanModifyStock(profile, store);
    return {
      canModifyStock: baseModify,
      canEditTotal: Boolean(grant),
      grantRequestId: grant?.requestId ?? null,
    };
  }

  return {
    canModifyStock: baseCanModifyStock(profile, store),
    canEditTotal: baseCanEditStockTotal(profile, store),
    grantRequestId: null,
  };
}
