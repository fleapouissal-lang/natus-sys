import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import { parseWeekParam } from "@/lib/scheduling/week";
import { resolvePlanningSubject } from "@/lib/cashier/planning-subject";
import { CashierMySchedule } from "@/components/scheduling/cashier-my-schedule";

export default async function CashierPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");

  const subject = await resolvePlanningSubject(profile);
  if ("redirectTo" in subject) redirect(subject.redirectTo);

  const weekStart = parseWeekParam(weekParam);
  const [shifts, weekOffs] = await Promise.all([
    getMyCashierShifts({ weekStart, cashierId: subject.cashierId }),
    getCashierWeekOffs({ weekStart, cashierIds: [subject.cashierId] }),
  ]);

  const offDate = weekOffs[0]?.off_date ?? null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Mon planning — {subject.displayName}
        </h1>
        <p className="mt-1 text-muted">
          Horaires de la semaine · lecture seule
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierMySchedule shifts={shifts} weekStart={weekStart} offDate={offDate} />
      </Suspense>
    </div>
  );
}
