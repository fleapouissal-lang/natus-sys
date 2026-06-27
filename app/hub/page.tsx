import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubCityStaff, getHubStoreByCity, getHubAssignedStores } from "@/lib/hub";
import { getStoresWithStats } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { getStoreOverviewStats, getStoresSnapshots } from "@/lib/dashboard";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { HubCashiersTable } from "@/components/hub/hub-cashiers-table";
import { HubDashboardPanel } from "@/components/hub/hub-dashboard-panel";

export default async function HubDashboardPage() {
  const profile = await requireRole(["hub"]);
  if (!profile || !profile.city) redirect("/login");

  const [staff, hubStore, assignedStores] = await Promise.all([
    getHubCityStaff(profile.city),
    getHubStoreByCity(profile.city),
    getHubAssignedStores(profile.id),
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
  const hubActivities = allActivities.filter((entry) => entry.actor_role === "hub");

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
        <p className="mt-1 text-muted">
          Dépôt {profile.city}
          {hubStore ? ` · ${hubStore.name}` : ""}
        </p>
      </div>

      <HubDashboardPanel
        city={profile.city}
        hubStoreName={hubStore?.name}
        retailStores={retailStores}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
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
