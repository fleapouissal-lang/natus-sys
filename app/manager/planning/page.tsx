import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getCityCashiers, getCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import {
  getCashierStoreTransfers,
} from "@/lib/scheduling/transfers";
import {
  getPlanningCashiersForStore,
} from "@/lib/scheduling/transfer-utils";
import { parseWeekParam } from "@/lib/scheduling/week";
import { CashierScheduleManager } from "@/components/scheduling/cashier-schedule-manager";
import type { Store } from "@/lib/types";

function resolvePlanningStoreId(stores: Store[], storeParam?: string | null): string {
  if (storeParam && stores.some((s) => s.id === storeParam)) return storeParam;
  return stores[0]?.id || "";
}

export default async function ManagerPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; week?: string }>;
}) {
  const { store: storeParam, week: weekParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const storeIds = stores.map((s) => s.id);
  const selectedStoreId = resolvePlanningStoreId(stores, storeParam);
  const weekStart = parseWeekParam(weekParam);

  const allCashiers = await getCityCashiers(storeIds);

  const [shifts, allShifts, weekOffs, transfers] = await Promise.all([
    getCashierShifts({
      weekStart,
      storeId: selectedStoreId || null,
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
    getCashierStoreTransfers({ weekStart, storeIds }),
  ]);

  const planningCashiers = selectedStoreId
    ? getPlanningCashiersForStore({
        storeId: selectedStoreId,
        weekStart,
        allCashiers,
        transfers,
      })
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planning caissiers</h1>
        <p className="mt-1 text-muted">
          Grille par magasin · un créneau par jour · transfert temporaire ou définitif
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierScheduleManager
          stores={stores}
          planningCashiers={planningCashiers}
          shifts={shifts}
          allShifts={allShifts}
          weekOffs={weekOffs}
          transfers={transfers}
          weekStart={weekStart}
          selectedStoreId={selectedStoreId}
        />
      </Suspense>
    </div>
  );
}
