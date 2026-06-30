import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog, getStoreStockMap } from "@/lib/inventory";
import { filterCashierIncomingInterStore } from "@/lib/cashier-transfer-filters";
import { getCashierIncomingHubToStoreTransfers } from "@/lib/hub-transfers";
import { getCashierIncomingStoreTransfers } from "@/lib/store-transfers";
import { resolveReceivedTransfersScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { CashierReceivedOrdersTabs } from "@/components/stock/cashier-received-orders-tabs";

export default async function CashierTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string; tab?: string; q?: string; status?: string; source?: string; dest?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;
  const store = await getStoreById(storeId);
  const filter = resolveReceivedTransfersScope(
    profile,
    store ? [store] : [],
    params
  );

  const [storeTransfers, hubTransfers, products, storeStockByProductId] =
    await Promise.all([
      getCashierIncomingStoreTransfers(storeId),
      getCashierIncomingHubToStoreTransfers(storeId),
      getProductCatalog(),
      getStoreStockMap(storeId),
    ]);

  const interStoreTransfers = filterCashierIncomingInterStore(storeTransfers, storeId);
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
  const productLookup = buildReceivedTransferProductLookup(products);
  const storeName = store?.name || "votre magasin";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tous les transferts entrants dès la création — dépôt hub et autres magasins · {storeName}
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierReceivedOrdersTabs
          filter={filter}
          storeId={storeId}
          storeName={storeName}
          storeSite={
            store
              ? {
                  id: store.id,
                  name: store.name,
                  city: store.city,
                  is_hub: store.is_hub,
                }
              : { id: storeId, name: storeName, city: "", is_hub: false }
          }
          interStoreTransfers={interStoreTransfers}
          hubToStoreTransfers={hubTransfers}
          productsById={productsById}
          storeStockByProductId={storeStockByProductId}
          productLookup={productLookup}
        />
      </Suspense>
    </div>
  );
}
