import { redirect } from "next/navigation";
import Link from "next/link";
import { Warehouse, Users, Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getHubCityStaff, getHubAssignedManagers, getHubStoreByCity } from "@/lib/hub";
import { getActivityLog } from "@/lib/activity";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { HubCashiersTable } from "@/components/hub/hub-cashiers-table";
import { Card } from "@/components/ui/card";

export default async function HubDashboardPage() {
  const profile = await requireRole(["hub"]);
  if (!profile || !profile.city) redirect("/login");

  const [staff, assignedManagers, hubStore] = await Promise.all([
    getHubCityStaff(profile.city),
    getHubAssignedManagers(profile.id),
    getHubStoreByCity(profile.city),
  ]);

  const retailStores = staff.stores.filter((s) => !s.is_hub);
  const storeIds = staff.stores.map((s) => s.id);
  const allActivities = storeIds.length > 0 ? await getActivityLog(storeIds, 40) : [];
  const hubActivities = allActivities.filter((entry) => entry.actor_role === "hub");

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
        <p className="mt-1 text-muted">
          Hub stock — {profile.city}
          {hubStore ? ` · ${hubStore.name}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Gérants affectés</p>
          <p className="mt-1 text-3xl font-bold">{assignedManagers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Magasins ville</p>
          <p className="mt-1 text-3xl font-bold">{retailStores.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Caissiers ville</p>
          <p className="mt-1 text-3xl font-bold">{staff.cashiers.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-primary" />
              Gérants — {profile.city}
            </h2>
          </div>
          {assignedManagers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted">Aucun gérant affecté</p>
          ) : (
            <ul className="divide-y divide-border">
              {assignedManagers.map((manager) => (
                <li key={manager.id} className="px-6 py-4">
                  <p className="font-medium">{manager.full_name}</p>
                  <p className="text-sm text-muted">{manager.email}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Store className="h-5 w-5 text-primary" />
              Magasins — {profile.city}
            </h2>
          </div>
          {retailStores.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted">Aucun magasin</p>
          ) : (
            <ul className="divide-y divide-border">
              {retailStores.map((store) => (
                <li key={store.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium">{store.name}</p>
                    {store.address && (
                      <p className="text-sm text-muted">{store.address}</p>
                    )}
                  </div>
                  <Link
                    href={`/hub/stock?store=${store.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Stock →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {hubStore && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{hubStore.name}</p>
            <p className="text-sm text-muted">Entrepôt central — {hubStore.city}</p>
          </div>
          <Link
            href="/hub/hub-stock"
            className="inline-flex items-center gap-2 rounded-md border border-primary bg-champagne px-4 py-2 text-sm font-medium text-black hover:brightness-95"
          >
            <Warehouse className="h-4 w-4" />
            Gérer le stock hub
          </Link>
        </Card>
      )}

      <RecentActivityPanel
        activities={hubActivities}
        title="Mes actions récentes"
        description="Modifications de stock et transferts effectués par le hub"
        viewAllHref="/hub/activity"
        paginate
      />

      <HubCashiersTable cashiers={staff.cashiers} city={profile.city} />
    </div>
  );
}
