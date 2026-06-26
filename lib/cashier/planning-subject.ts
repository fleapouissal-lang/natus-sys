import type { Profile } from "@/lib/types";

type PlanningRedirect = { redirectTo: "/cashier/pos" };

export type PlanningStoreView = {
  kind: "store";
  storeId: string;
};

export type PlanningPersonalView = {
  kind: "personal";
  cashierId: string;
  displayName: string;
};

export async function resolvePlanningSubject(
  profile: Pick<Profile, "id" | "full_name" | "email" | "is_store_pos" | "store_id">
): Promise<PlanningRedirect | PlanningStoreView | PlanningPersonalView> {
  if (profile.is_store_pos) {
    if (!profile.store_id) return { redirectTo: "/cashier/pos" };
    return { kind: "store", storeId: profile.store_id };
  }

  return {
    kind: "personal",
    cashierId: profile.id,
    displayName: profile.full_name || profile.email || "Caissier",
  };
}

export function isPlanningRedirect(
  value: PlanningRedirect | PlanningStoreView | PlanningPersonalView
): value is PlanningRedirect {
  return "redirectTo" in value;
}

export function isPlanningStoreView(
  value: PlanningRedirect | PlanningStoreView | PlanningPersonalView
): value is PlanningStoreView {
  return "kind" in value && value.kind === "store";
}

export function isPlanningPersonalView(
  value: PlanningRedirect | PlanningStoreView | PlanningPersonalView
): value is PlanningPersonalView {
  return "kind" in value && value.kind === "personal";
}
