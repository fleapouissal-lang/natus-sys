import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getCityCashiers, getCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import { parseWeekParam } from "@/lib/scheduling/week";
import { CashierScheduleManager } from "@/components/scheduling/cashier-schedule-manager";
import type { Store } from "@/lib/types";

function resolvePlanningStoreId(stores: Store[], storeParam?: string | null): string {
  if (storeParam === "") return "";
  if (storeParam && stores.some((s) => s.id === storeParam)) return storeParam;
  return "";
}

function resolvePlanningCashierId(
  cashiers: { id: string }[],
  cashierParam?: string | null
): string {
  if (cashierParam === "") return "";
  if (cashierParam && cashiers.some((c) => c.id === cashierParam)) return cashierParam;
  return "";
}

export default async function ManagerPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; cashier?: string; week?: string }>;
}) {
  const { store: storeParam, cashier: cashierParam, week: weekParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const storeIds = stores.map((s) => s.id);
  const selectedStoreId = resolvePlanningStoreId(stores, storeParam);
  const weekStart = parseWeekParam(weekParam);

  const allCashiers = await getCityCashiers(storeIds);
  const selectedCashierId = resolvePlanningCashierId(allCashiers, cashierParam);

  let cashiers = allCashiers;
  if (selectedStoreId) {
    cashiers = cashiers.filter((c) => c.store_id === selectedStoreId);
  }
  if (selectedCashierId) {
    cashiers = cashiers.filter((c) => c.id === selectedCashierId);
  }

  const [shifts, allShifts, weekOffs] = await Promise.all([
    getCashierShifts({
      weekStart,
      storeId: selectedStoreId || null,
      cashierId: selectedCashierId || null,
      storeIds,
    }),
    getCashierShifts({
      weekStart,
      storeIds,
    }),
    getCashierWeekOffs({
      weekStart,
      cashierIds: allCashiers.map((c) => c.id),
    }),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planning caissiers</h1>
        <p className="mt-1 text-muted">
          Affectez les caissiers aux magasins · un jour de repos par caissier · un seul créneau par
          jour
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierScheduleManager
          stores={stores}
          allCashiers={allCashiers}
          cashiers={cashiers}
          shifts={shifts}
          allShifts={allShifts}
          weekOffs={weekOffs}
          weekStart={weekStart}
          selectedStoreId={selectedStoreId}
          selectedCashierId={selectedCashierId}
        />
      </Suspense>
    </div>
  );
}
