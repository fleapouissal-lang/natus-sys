import type { Profile } from "@/lib/types";

type PlanningRedirect = { redirectTo: "/cashier/pos" };
type PlanningSubject = {
  cashierId: string;
  displayName: string;
};

export async function resolvePlanningSubject(
  profile: Pick<Profile, "id" | "full_name" | "email" | "is_store_pos">
): Promise<PlanningRedirect | PlanningSubject> {
  return {
    cashierId: profile.id,
    displayName: profile.full_name || profile.email || "Caissier",
  };
}

export function isPlanningRedirect(
  value: PlanningRedirect | PlanningSubject
): value is PlanningRedirect {
  return "redirectTo" in value;
}
