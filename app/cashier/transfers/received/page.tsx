import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog, getStoreStockMap } from "@/lib/inventory";
import {
  filterCashierIncomingInterStore,
} from "@/lib/cashier-transfer-filters";
import { getCashierIncomingHubToStoreTransfers } from "@/lib/hub-transfers";
import { getCashierIncomingStoreTransfers } from "@/lib/store-transfers";
import { CashierReceivedOrdersTabs } from "@/components/stock/cashier-received-orders-tabs";

export default async function CashierTransfersReceivedPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;

  const [store, storeTransfers, hubTransfers, products, storeStockByProductId] =
    await Promise.all([
      getStoreById(storeId),
      getCashierIncomingStoreTransfers(storeId),
      getCashierIncomingHubToStoreTransfers(storeId),
      getProductCatalog(),
      getStoreStockMap(storeId),
    ]);

  const interStoreTransfers = filterCashierIncomingInterStore(storeTransfers, storeId);
  const hubToStoreTransfers = hubTransfers;
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
  const storeName = store?.name || "votre magasin";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts entrants dès la création — dépôt hub et autres magasins
        </p>
      </div>

      <Suspense fallback={null}>
        <CashierReceivedOrdersTabs
          storeId={storeId}
          storeName={storeName}
          interStoreTransfers={interStoreTransfers}
          hubToStoreTransfers={hubToStoreTransfers}
          productsById={productsById}
          storeStockByProductId={storeStockByProductId}
        />
      </Suspense>
    </div>
  );
}
