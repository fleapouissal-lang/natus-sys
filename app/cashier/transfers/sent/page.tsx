import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog } from "@/lib/inventory";
import { getHubCityLivreurs } from "@/lib/hub";
import {
  filterCashierOutgoingInterStore,
  filterCashierOutgoingStoreToHub,
} from "@/lib/cashier-transfer-filters";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
} from "@/lib/transfer-sites.server";
import { getCashierOutgoingStoreToHubTransfers } from "@/lib/hub-transfers";
import { getCashierOutgoingStoreTransfers } from "@/lib/store-transfers";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { CashierSentOrdersTabs } from "@/components/stock/cashier-sent-orders-tabs";

function resolveHubStoreId(
  hubStores: { id: string }[],
  hubParam?: string | null
): string {
  if (hubParam && hubStores.some((hub) => hub.id === hubParam)) {
    return hubParam;
  }
  return hubStores[0]?.id || "";
}

export default async function CashierTransfersSentPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    dest?: string;
    hub?: string;
    q?: string;
    status?: string;
    source?: string;
    listDest?: string;
    sentFrom?: string;
    sentTo?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;
  const store = await getStoreById(storeId);
  const city = store?.city || profile.city;
  const storeName = store?.name || "votre magasin";

  const sitesAll = await getAllActiveTransferSites();
  const destinationStores = sitesAll.filter((site) => site.is_active && !site.is_hub);
  const destinationSites = sitesAll.filter((site) => site.is_active);
  const hubStores = sitesAll.filter((site) => site.is_active && site.is_hub);
  const toHubStoreId = resolveHubStoreId(hubStores, params.hub);
  const initialDestination = params.dest === "hub" ? "hub" : "store";
  const toStoreId =
    params.to &&
    params.to !== storeId &&
    destinationStores.some((site) => site.id === params.to)
      ? params.to
      : destinationStores.find((site) => site.id !== storeId)?.id || "";

  const filter = resolveSentTransfersListScope(
    profile,
    store ? [store] : [],
    params,
    { lockSourceToScopedStore: true }
  );

  const [
    storeTransfers,
    hubTransfers,
    livreurs,
    products,
    catalogProducts,
  ] = await Promise.all([
    getCashierOutgoingStoreTransfers(storeId),
    getCashierOutgoingStoreToHubTransfers(storeId),
    city ? getHubCityLivreurs(city) : Promise.resolve([]),
    getProductsWithStoreStockForTransfer(storeId),
    getProductCatalog(),
  ]);

  const interStoreTransfers = filterCashierOutgoingInterStore(storeTransfers, storeId);
  const storeToHubTransfers = filterCashierOutgoingStoreToHub(hubTransfers, storeId);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const storeSite = store
    ? {
        id: store.id,
        name: store.name,
        city: store.city,
        is_hub: store.is_hub,
      }
    : {
        id: storeId,
        name: storeName,
        city: city || "",
        is_hub: false,
      };

  const sourceStores = store ? [store] : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks envoyés
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts sortants depuis {storeName} — tous statuts
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierSentOrdersTabs
          storeId={storeId}
          storeName={storeName}
          storeSite={storeSite}
          sourceStores={sourceStores}
          destinationStores={destinationStores}
          hubStores={hubStores}
          products={products}
          fromStoreId={storeId}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
          initialDestination={initialDestination}
          interStoreTransfers={interStoreTransfers}
          storeToHubTransfers={storeToHubTransfers}
          destinationSites={destinationSites}
          livreurs={livreurs}
          filter={filter}
          productLookup={productLookup}
        />
      </Suspense>
    </div>
  );
}
