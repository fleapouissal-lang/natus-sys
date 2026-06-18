import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getStoresWithStats } from "@/lib/inventory";
import { getDashboardStats, getStoreOverviewStats, getStoresSnapshots } from "@/lib/dashboard";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
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
  const stores = await getActiveStores(city);
  const storesWithStats = await getStoresWithStats(city);
  const storeId = resolveSelectedStoreId(stores, storeParam);
  const selectedStore = getSelectedStore(stores, storeId);
  const [stats, storeOverview, storeSnapshots, storeActivities] = await Promise.all([
    storeId ? getDashboardStats(storeId) : Promise.resolve(null),
    getStoreOverviewStats(storesWithStats),
    getStoresSnapshots(stores),
    storeId ? getActivityLog([storeId], 12) : Promise.resolve([]),
  ]);

  const overviewByStore = Object.fromEntries(
    storeOverview.map((row) => [row.storeId, row])
  );

  const selectedStoreLabel = selectedStore
    ? `${selectedStore.name} — ${selectedStore.city}`
    : "";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-muted">
          Suivi multi-magasins et statistiques détaillées par point de vente
        </p>
      </div>

      <ManagerDashboardTabs
        stores={stores}
        selectedStoreId={storeId}
        selectedStoreLabel={selectedStoreLabel}
        stats={stats}
        storeOverview={storeOverview}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
        storeActivities={storeActivities}
      />
    </div>
  );
}
