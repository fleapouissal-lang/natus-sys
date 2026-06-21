import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import { parseWeekParam } from "@/lib/scheduling/week";
import { CashierMySchedule } from "@/components/scheduling/cashier-my-schedule";

export default async function CashierPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");

  const weekStart = parseWeekParam(weekParam);
  const [shifts, weekOffs] = await Promise.all([
    getMyCashierShifts({ weekStart, cashierId: profile.id }),
    getCashierWeekOffs({ weekStart, cashierIds: [profile.id] }),
  ]);

  const offDate = weekOffs[0]?.off_date ?? null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon planning</h1>
        <p className="mt-1 text-muted">
          Vos horaires et magasins affectés pour la semaine
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierMySchedule shifts={shifts} weekStart={weekStart} offDate={offDate} />
      </Suspense>
    </div>
  );
}
