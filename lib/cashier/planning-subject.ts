import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import { parseWeekParam } from "@/lib/scheduling/week";
import { getActivePosOperator } from "@/lib/pos/operator-session";

export async function resolvePlanningSubject(profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>) {
  if (profile.is_store_pos) {
    const session = await getActivePosOperator(profile);
    if (!session?.operator_id) {
      return { redirectTo: "/cashier/pos" as const };
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
