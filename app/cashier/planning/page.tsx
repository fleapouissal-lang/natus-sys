import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getCityCashiers, getCashierShifts, getMyCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import { getCashierStoreTransfers } from "@/lib/scheduling/transfers";
import { getPlanningCashiersForStore } from "@/lib/scheduling/transfer-utils";
import { parseWeekParam } from "@/lib/scheduling/week";
import {
  resolvePlanningSubject,
  isPlanningRedirect,
  isPlanningStoreView,
  isPlanningPersonalView,
} from "@/lib/cashier/planning-subject";
import { CashierMySchedule } from "@/components/scheduling/cashier-my-schedule";
import { CashierScheduleManager } from "@/components/scheduling/cashier-schedule-manager";

export default async function CashierPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");

  const subject = await resolvePlanningSubject(profile);
  if (isPlanningRedirect(subject)) redirect(subject.redirectTo);

  const weekStart = parseWeekParam(weekParam);

  if (isPlanningStoreView(subject)) {
    const storeId = subject.storeId;
    const storesAll = await getActiveStores();
    const store = storesAll.find((s) => s.id === storeId);
    if (!store) redirect("/cashier/pos");

    const storeIds = [storeId];
    const allCashiers = await getCityCashiers(storeIds);

    const [shifts, allShifts, weekOffs, transfers] = await Promise.all([
      getCashierShifts({ weekStart, storeId, storeIds }),
      getCashierShifts({ weekStart, storeIds }),
      getCashierWeekOffs({
        weekStart,
        cashierIds: allCashiers.map((c) => c.id),
      }),
      getCashierStoreTransfers({ weekStart, storeIds }),
    ]);

    const planningCashiers = getPlanningCashiersForStore({
      storeId,
      weekStart,
      allCashiers,
      transfers,
    });

    return (
      <div className="animate-fade-in space-y-4 md:space-y-6">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight">
            Planning — {store.name}
          </h1>
          <p className="mt-1 text-muted">
            Horaires de toute l&apos;équipe caisse · lecture seule
          </p>
        </div>

        <Suspense fallback={null}>
          <CashierScheduleManager
            stores={[store]}
            planningCashiers={planningCashiers}
            shifts={shifts}
            allShifts={allShifts}
            weekOffs={weekOffs}
            transfers={transfers}
            weekStart={weekStart}
            selectedStoreId={storeId}
            readOnly
            hideStoreFilter
          />
        </Suspense>
      </div>
    );
  }

  if (!isPlanningPersonalView(subject)) redirect("/cashier/pos");

  const [shifts, weekOffs] = await Promise.all([
    getMyCashierShifts({ weekStart, cashierId: subject.cashierId }),
    getCashierWeekOffs({ weekStart, cashierIds: [subject.cashierId] }),
  ]);

  const offDate = weekOffs[0]?.off_date ?? null;

  return (
    <div className="animate-fade-in space-y-4 md:space-y-6">
      <div className="hidden md:block">
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
