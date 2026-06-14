import { getRoleLabel } from "@/lib/permissions";
import type { ActivityKind, UserRole } from "@/lib/types";

export function getActivityKindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "stock_add":
      return "Ajout stock";
    case "stock_adjustment":
      return "Ajustement";
    case "sale":
      return "Vente";
  }
}

export function getActorRoleLabel(role: UserRole | null): string {
  if (!role) return "—";
  return getRoleLabel(role);
}

export function resolveActivityStoreIds(
  stores: { id: string; city: string }[],
  options: { city?: string | null; storeId?: string | null }
): string[] {
  if (options.storeId && stores.some((s) => s.id === options.storeId)) {
    return [options.storeId];
  }
  if (options.city) {
    return stores.filter((s) => s.city === options.city).map((s) => s.id);
  }
  return stores.map((s) => s.id);
}
