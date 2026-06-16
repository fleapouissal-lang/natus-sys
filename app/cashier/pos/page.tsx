import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { loadShopifyOrderForPos, getShopifyOrders } from "@/lib/orders";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; shopify_order?: string }>;
}) {
  const { store: storeParam, shopify_order: shopifyOrderId } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);

  const storeId =
    profile?.role === "cashier"
      ? profile.store_id || resolveSelectedStoreId(stores, storeParam)
      : resolveSelectedStoreId(stores, storeParam);

  const products = storeId ? await getProductsWithStoreStock(storeId) : [];
  const selectedStore = getSelectedStore(stores, storeId);
  const showStoreFilter =
    profile?.role === "manager" ||
    profile?.role === "directeur" ||
    profile?.role === "admin";

  let shopifyLoad = null;
  let shopifyError: string | null = null;
  const shopifyOrders = profile ? await getShopifyOrders(profile) : [];
  const loyaltySettings = await getLoyaltySettings();

  if (shopifyOrderId && profile) {
    const result = await loadShopifyOrderForPos(profile, shopifyOrderId, products);
    if ("error" in result) {
      shopifyError = result.error;
    } else {
      shopifyLoad = result.data;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showStoreFilter && stores.length > 0 && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <Suspense fallback={null}>
            <StoreFilterBar stores={stores} selectedStoreId={storeId} />
          </Suspense>
        </div>
      )}

      {shopifyError && (
        <p className="shrink-0 mx-4 mt-3 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {shopifyError}
        </p>
      )}

      <div className="min-h-0 flex-1">
        <PosTerminal
          products={products}
          role={profile?.role || "cashier"}
          cashierName={profile?.full_name || profile?.email || "Caissier"}
          stores={stores}
          defaultStoreId={storeId}
          storeName={selectedStore?.name}
          initialCart={shopifyLoad?.cart}
          shopifyOrder={shopifyLoad?.context}
          missingShopifyProducts={shopifyLoad?.missingProducts}
          shopifyOrders={shopifyOrders}
          loyaltySettings={loyaltySettings}
        />
      </div>
    </div>
  );
}
