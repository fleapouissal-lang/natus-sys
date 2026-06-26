import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterStoresByProfile } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getProfileLockedStoreId } from "@/lib/management-store";
import { getCityCashiers, getCashierShifts } from "@/lib/scheduling/shifts";
import { getCashierWeekOffs } from "@/lib/scheduling/week-offs";
import {
  getCashierStoreTransfers,
} from "@/lib/scheduling/transfers";
import {
  getPlanningCashiersForStore,
} from "@/lib/scheduling/transfer-utils";
import { parseWeekParam } from "@/lib/scheduling/week";
import { getStorePlanningCashiers } from "@/lib/scheduling/planning-cashiers";
import { CashierScheduleManager } from "@/components/scheduling/cashier-schedule-manager";
import { PlanningCashierRoster } from "@/components/scheduling/planning-cashier-roster";
import type { Store } from "@/lib/types";

function resolvePlanningStoreId(
  stores: Store[],
  storeParam?: string | null,
  lockedStoreId?: string | null
): string {
  if (lockedStoreId && stores.some((s) => s.id === lockedStoreId)) {
    return lockedStoreId;
  }
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
  const storesAll = await getActiveStores(city);
  const stores = profile ? filterStoresByProfile(storesAll, profile) : storesAll;
  const storeIds = stores.map((s) => s.id);
  const selectedStoreId = resolvePlanningStoreId(
    stores,
    storeParam,
    getProfileLockedStoreId(profile)
  );
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

  const rosterCashiers = selectedStoreId
    ? await getStorePlanningCashiers(selectedStoreId)
    : [];

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planning caissiers</h1>
        <p className="mt-1 text-muted">
          Noms par magasin pour le planning · un compte caisse partagé pour la connexion
        </p>
      </div>

      <PlanningCashierRoster
        storeId={selectedStoreId}
        storeName={selectedStore?.name || "—"}
        cashiers={rosterCashiers}
      />

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
