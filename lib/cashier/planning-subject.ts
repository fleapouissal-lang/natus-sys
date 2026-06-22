import type { Profile } from "@/lib/types";
import { getActivePosOperator } from "@/lib/pos/operator-session";

type PlanningRedirect = { redirectTo: "/cashier/pos" };
type PlanningSubject = {
  cashierId: string;
  displayName: string;
};

export async function resolvePlanningSubject(
  profile: Pick<Profile, "id" | "full_name" | "email" | "is_store_pos">
): Promise<PlanningRedirect | PlanningSubject> {
  if (profile.is_store_pos) {
    const session = await getActivePosOperator(profile);
    if (!session?.operator_id) {
      return { redirectTo: "/cashier/pos" };
    }

    return {
      cashierId: session.operator_id,
      displayName:
        session.operator?.full_name || session.operator?.email || "Caissier",
    };
  }

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
