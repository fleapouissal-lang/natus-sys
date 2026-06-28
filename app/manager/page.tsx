import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterRetailStoresByProfile, filterStoresByProfile, isDirector } from "@/lib/permissions";
import { getActiveStores, getStoresWithStats } from "@/lib/inventory";
import { getDashboardStats, getStoreOutOfStockProducts, getStoreOverviewStats, getStoresSnapshots } from "@/lib/dashboard";
import {
  resolveSelectedStoreId,
  getSelectedStore,
  getProfileLockedStoreId,
} from "@/lib/management-store";
import { getActivityLog } from "@/lib/activity";
import { ManagerDashboardTabs } from "@/components/dashboard/manager-dashboard-tabs";

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; tab?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const storesAll = await getActiveStores(city);
  const filterDashboardStores = profile
    ? isDirector(profile)
      ? filterStoresByProfile
      : filterRetailStoresByProfile
    : null;
  const stores = filterDashboardStores
    ? filterDashboardStores(storesAll, profile!)
    : storesAll;
  const storesWithStatsAll = await getStoresWithStats(city);
  const storesWithStatsFiltered = filterDashboardStores
    ? filterDashboardStores(storesWithStatsAll, profile!)
    : storesWithStatsAll;
  const storeId = resolveSelectedStoreId(
    stores,
    storeParam,
    getProfileLockedStoreId(profile)
  );
  const selectedStore = getSelectedStore(stores, storeId);
  const [stats, storeSnapshots, storeActivities, storeOverview, outOfStockProducts] =
    await Promise.all([
      storeId ? getDashboardStats(storeId) : Promise.resolve(null),
      getStoresSnapshots(stores),
      storeId ? getActivityLog([storeId], 12) : Promise.resolve([]),
      getStoreOverviewStats(storesWithStatsFiltered),
      storeId ? getStoreOutOfStockProducts(storeId) : Promise.resolve([]),
    ]);

  const overviewByStore = Object.fromEntries(
    storeOverview.map((row) => [row.storeId, row])
  );

  const selectedStoreLabel = selectedStore
    ? `${selectedStore.name} — ${selectedStore.city}`
    : "";

  const showPageHeader = !profile || !isDirector(profile);

  return (
    <div className="animate-fade-in space-y-4 md:space-y-6">
      <div className={showPageHeader ? undefined : "hidden md:block"}>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-muted">
          Suivi, stock et ruptures par magasin — filtrez par point de vente et période
        </p>
      </div>

      <ManagerDashboardTabs
        stores={stores}
        selectedStoreId={storeId}
        selectedStoreLabel={selectedStoreLabel}
        stats={stats}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
        storeActivities={storeActivities}
        outOfStockProducts={outOfStockProducts}
        storesWithStats={storesWithStatsFiltered}
      />
    </div>
  );
}
