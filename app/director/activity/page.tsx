import { Suspense } from "react";
import { getActiveStores } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { resolveActivityStoreIds } from "@/lib/activity-utils";
import { getSelectedStore } from "@/lib/management-store";
import { CityStoreFilterBar } from "@/components/stores/city-store-filter-bar";
import { ActivityLog } from "@/components/activity/activity-log";
import { Card } from "@/components/ui/card";

export default async function DirectorActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string }>;
}) {
  const { city: cityParam, store: storeParam } = await searchParams;
  const stores = await getActiveStores(null);
  const selectedCity = cityParam && stores.some((s) => s.city === cityParam) ? cityParam : "";
  const selectedStoreId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : "";
  const selectedStore = selectedStoreId
    ? getSelectedStore(stores, selectedStoreId)
    : undefined;

  const storeIds = resolveActivityStoreIds(stores, {
    city: selectedCity || null,
    storeId: selectedStoreId || null,
  });

  const activities = storeIds.length > 0 ? await getActivityLog(storeIds) : [];

  const stockAdds = activities.filter((a) => a.kind === "stock_add").length;
  const sales = activities.filter((a) => a.kind === "sale").length;
  const adjustments = activities.filter((a) => a.kind === "stock_adjustment").length;

  let scopeLabel = "Tous les magasins";
  if (selectedStore) {
    scopeLabel = `${selectedStore.name} — ${selectedStore.city}`;
  } else if (selectedCity) {
    scopeLabel = `Tous les magasins — ${selectedCity}`;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activité</h1>
        <p className="mt-1 text-muted">
          Actions gérants et caissiers — filtres par ville ou magasin
        </p>
      </div>

      <Suspense fallback={null}>
        <CityStoreFilterBar
          stores={stores}
          selectedCity={selectedCity}
          selectedStoreId={selectedStoreId}
        />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Actions récentes</p>
          <p className="mt-1 text-2xl font-bold">{activities.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ajouts stock</p>
          <p className="mt-1 text-2xl font-bold">{stockAdds}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ajustements</p>
          <p className="mt-1 text-2xl font-bold">{adjustments}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ventes</p>
          <p className="mt-1 text-2xl font-bold">{sales}</p>
        </Card>
      </div>

      <ActivityLog
        activities={activities}
        scopeLabel={scopeLabel}
        showStoreColumn={!selectedStoreId}
      />
    </div>
  );
}
