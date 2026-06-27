import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getHubCityLivreurs } from "@/lib/hub";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import type { Store } from "@/lib/types";

function resolveTransferStoreIds(
  stores: Store[],
  fromParam?: string | null,
  toParam?: string | null
) {
  const fromStoreId =
    fromParam && stores.some((s) => s.id === fromParam)
      ? fromParam
      : stores[0]?.id || "";
  const destinationCandidates = stores.filter((s) => s.id !== fromStoreId);
  const toStoreId =
    toParam &&
    toParam !== fromStoreId &&
    stores.some((s) => s.id === toParam)
      ? toParam
      : destinationCandidates[0]?.id || "";

  return { fromStoreId, toStoreId };
}

export default async function DirectorStockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const storesAll = await getActiveStores(null);
  const stores = storesAll.filter((s) => s.is_active && !s.is_hub);
  const storeIds = stores.map((s) => s.id);
  const { fromStoreId, toStoreId } = resolveTransferStoreIds(stores, fromParam, toParam);

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = fromStoreId ? await getProductsWithStoreStock(fromStoreId) : [];
  const storeCities = [...new Set(stores.map((s) => s.city).filter(Boolean))];
  const livreurGroups = await Promise.all(
    storeCities.map((city) => getHubCityLivreurs(city))
  );
  const livreurs = livreurGroups
    .flat()
    .filter((livreur, index, all) => all.findIndex((item) => item.id === livreur.id) === index);
  const transfers = await getManagerStoreStockTransfers(storeIds);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Créer et suivre les transferts de stock entre magasins
        </p>
      </div>

      <StoreStockTransferManager
        stores={stores}
        products={products}
        fromStoreId={fromStoreId}
        toStoreId={toStoreId}
        basePath="/director"
      />

      <StoreTransfersList
        title="Commandes envoyées"
        perspective="outgoing"
        managedStoreIds={storeIds}
        transfers={transfers}
        livreurs={livreurs}
      />
    </div>
  );
}
