import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ActivityLog } from "@/components/activity/activity-log";
import { Card } from "@/components/ui/card";

export default async function ManagerActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const storeId = resolveSelectedStoreId(stores, storeParam);
  const selectedStore = getSelectedStore(stores, storeId);

  const activities = storeId
    ? await getActivityLog([storeId])
    : [];

  const stockAdds = activities.filter((a) => a.kind === "stock_add").length;
  const sales = activities.filter((a) => a.kind === "sale").length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activité</h1>
        <p className="mt-1 text-muted">
          Historique des actions par magasin — stock et ventes
        </p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {selectedStore ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-muted">Actions récentes</p>
              <p className="mt-1 text-2xl font-bold">{activities.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Ajouts stock</p>
              <p className="mt-1 text-2xl font-bold">{stockAdds}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Ventes</p>
              <p className="mt-1 text-2xl font-bold">{sales}</p>
            </Card>
          </div>

          <ActivityLog
            activities={activities}
            scopeLabel={`${selectedStore.name} — ${selectedStore.city}`}
          />
        </>
      ) : (
        <p className="py-12 text-center text-muted">
          Sélectionnez un magasin pour voir l&apos;activité
        </p>
      )}
    </div>
  );
}
