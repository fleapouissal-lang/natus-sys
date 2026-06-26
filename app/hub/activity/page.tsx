import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getActivityLog } from "@/lib/activity";
import {
  getHubStoreByCity,
  getHubRetailStoresForTransfer,
} from "@/lib/hub";
import { getHubStockTransfers } from "@/lib/hub-transfers";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ActivityLog } from "@/components/activity/activity-log";
import { Card } from "@/components/ui/card";

export default async function HubActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const { store: storeParam } = await searchParams;
  const hubStore = await getHubStoreByCity(profile.city);
  const retailStores = await getHubRetailStoresForTransfer(profile.id);
  const stores = hubStore ? [hubStore, ...retailStores] : retailStores;

  const storeId = resolveSelectedStoreId(stores, storeParam || hubStore?.id);
  const selectedStore = getSelectedStore(stores, storeId);

  const [activities, hubTransfers] = await Promise.all([
    storeId ? getActivityLog([storeId]) : Promise.resolve([]),
    hubStore
      ? getHubStockTransfers({
          fromStoreId: hubStore.id,
          limit: 20,
        })
      : Promise.resolve([]),
  ]);

  const stockAdds = activities.filter((a) => a.kind === "stock_add").length;
  const adjustments = activities.filter((a) => a.kind === "stock_adjustment").length;
  const transferCount = activities.filter(
    (a) => a.kind === "stock_transfer_in" || a.kind === "stock_transfer_out"
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-muted">
          Historique des actions hub — entrepôt et magasins de {profile.city}
        </p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {selectedStore ? (
        <>
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
              <p className="text-sm text-muted">Transferts</p>
              <p className="mt-1 text-2xl font-bold">{transferCount}</p>
            </Card>
          </div>

          <ActivityLog
            activities={activities}
            scopeLabel={`${selectedStore.name} — ${selectedStore.city}`}
          />

          {hubStore && selectedStore.id === hubStore.id && hubTransfers.length > 0 && (
            <HubTransfersList
              transfers={hubTransfers}
              title="Transferts hub (envoyés / reçus)"
              allowRepair
            />
          )}
        </>
      ) : (
        <p className="py-12 text-center text-muted">
          Sélectionnez un magasin ou l&apos;entrepôt pour voir l&apos;activité
        </p>
      )}
    </div>
  );
}
