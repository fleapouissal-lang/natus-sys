import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubCityStaff, getHubStoreByCity, getHubStoresByCity, getHubAssignedStores } from "@/lib/hub";
import { getHubDashboardStats } from "@/lib/hub/dashboard-stats";
import { HubDashboardStats } from "@/components/hub/hub-dashboard-stats";
import { HubReportSwitcher } from "@/components/hub/hub-report-switcher";
import { HubDashboardSummaryTables } from "@/components/hub/hub-dashboard-summary-tables";
import { getStoresWithStats } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { getStoreOverviewStats, getStoresSnapshots } from "@/lib/dashboard";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { HubCashiersTable } from "@/components/hub/hub-cashiers-table";
import { HubDashboardPanel } from "@/components/hub/hub-dashboard-panel";
import type { StoreOverviewRow } from "@/lib/types";

export default async function HubDashboardPage() {
  const profile = await requireRole(["hub"]);
  if (!profile || !profile.city) redirect("/login");

  const [staff, hubStore, assignedStores, hubStores] = await Promise.all([
    getHubCityStaff(profile.city),
    getHubStoreByCity(profile.city),
    getHubAssignedStores(profile.id),
    getHubStoresByCity(profile.city),
  ]);

  const retailStores = assignedStores;
  const storesWithStatsAll = await getStoresWithStats(profile.city);
  const storesWithStats = storesWithStatsAll.filter((s) =>
    retailStores.some((r) => r.id === s.id)
  );

  const [storeSnapshots, storeOverview, allActivities] = await Promise.all([
    getStoresSnapshots(retailStores),
    getStoreOverviewStats(storesWithStats),
    retailStores.length > 0
      ? getActivityLog(retailStores.map((s) => s.id), 40)
      : Promise.resolve([]),
  ]);

  const overviewByStore = Object.fromEntries(storeOverview.map((row) => [row.storeId, row]));
  const hubStats = hubStore ? storesWithStatsAll.find((s) => s.id === hubStore.id) : null;
  const hubOverview: StoreOverviewRow | null = hubStats
    ? {
        storeId: hubStats.id,
        storeName: hubStats.name,
        todayRevenue: 0,
        todaySales: 0,
        weekRevenue: 0,
        totalRevenue: 0,
        totalSales: 0,
        lowStockCount: hubStats.lowStockCount,
        totalUnits: hubStats.totalUnits,
      }
    : null;
  const hubActivities = allActivities.filter((entry) => entry.actor_role === "hub");

  const dashboardStats = await getHubDashboardStats({
    profile,
    hubStoreId: hubStore?.id ?? null,
    hubStoreIds: hubStores.map((store) => store.id),
    assignedStoreIds: retailStores.map((store) => store.id),
    retailStoresWithStats: storesWithStats,
    hubStoreStats: hubStats ?? null,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
        <p className="mt-1 text-muted">
          Dépôt {profile.city}
          {hubStore ? ` · ${hubStore.name}` : ""} — vue d&apos;ensemble de l&apos;activité
        </p>
      </div>

      <HubDashboardStats stats={dashboardStats} />

      <HubReportSwitcher
        city={profile.city}
        hubStoreName={hubStore?.name}
        hubAnalytics={dashboardStats.analytics}
        assignedStores={retailStores.map((store) => ({
          id: store.id,
          name: store.name,
          city: store.city,
        }))}
      />

      <HubDashboardSummaryTables stats={dashboardStats} />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Suivi stock détaillé</h2>
        <p className="mt-1 text-sm text-muted">
          Évolution et statistiques par magasin assigné
        </p>
      </div>

      <HubDashboardPanel
        city={profile.city}
        hubStoreName={hubStore?.name}
        hubStoreId={hubStore?.id}
        hubOverview={hubOverview}
        retailStores={retailStores}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
        storesWithStats={storesWithStatsAll}
      />

      <RecentActivityPanel
        activities={hubActivities}
        title="Mes actions récentes"
        description="Modifications de stock et transferts effectués par le dépôt"
        viewAllHref="/hub/activity"
        paginate
      />

      <HubCashiersTable cashiers={staff.cashiers} city={profile.city} />
    </div>
  );
}
