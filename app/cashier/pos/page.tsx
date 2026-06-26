import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { loadShopifyOrderForPos, getShopifyOrders } from "@/lib/orders";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
import { getStorePosAccount } from "@/lib/pos/operator-session";
import { Card } from "@/components/ui/card";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; shopify_order?: string; switch?: string }>;
}) {
  const { store: storeParam, shopify_order: shopifyOrderId } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);

  const storeId =
    profile?.role === "cashier"
      ? profile.store_id || resolveSelectedStoreId(stores, storeParam)
      : resolveSelectedStoreId(stores, storeParam);

  const selectedStore = getSelectedStore(stores, storeId);
  const showStoreFilter =
    profile?.role === "manager" ||
    profile?.role === "directeur" ||
    profile?.role === "admin";

  if (
    profile?.role === "cashier" &&
    !profile.is_store_pos &&
    profile.store_id
  ) {
    const storePosAccount = await getStorePosAccount(profile.store_id);
    if (storePosAccount) {
      return (
        <div className="animate-fade-in flex h-full items-center justify-center p-8">
          <Card className="max-w-lg text-center">
            <h1 className="font-heading text-xl font-semibold text-primary">
              Caisse magasin requise
            </h1>
            <p className="mt-3 text-sm text-muted">
              Ce magasin utilise un compte caisse partagé. Connectez-vous avec{" "}
              <strong>{storePosAccount.full_name || storePosAccount.email}</strong>{" "}
              pour accéder à la caisse.
            </p>
          </Card>
        </div>
      );
    }
  }

  const products = storeId ? await getProductsWithStoreStock(storeId) : [];
  const loyaltySettings = await getLoyaltySettings();

  let shopifyLoad = null;
  let shopifyError: string | null = null;
  const shopifyOrders = profile ? await getShopifyOrders(profile) : [];

  if (shopifyOrderId && profile) {
    const result = await loadShopifyOrderForPos(profile, shopifyOrderId, products);
    if ("error" in result) {
      shopifyError = result.error;
    } else {
      shopifyLoad = result.data;
    }
  }

  const cashierName =
    profile?.full_name || profile?.email || "Caissier";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showStoreFilter && stores.length > 0 && (
        <div className="shrink-0 border-b border-border px-4 py-2.5">
          <Suspense fallback={null}>
            <StoreFilterBar
              stores={stores}
              selectedStoreId={storeId}
              layout={
                profile?.role === "directeur" || profile?.role === "admin"
                  ? "compact"
                  : "default"
              }
              title="Magasin"
              className={
                profile?.role === "directeur" || profile?.role === "admin"
                  ? "p-0"
                  : undefined
              }
            />
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
          cashierName={cashierName}
          stores={stores}
          defaultStoreId={storeId}
          storeName={selectedStore?.name}
          initialCart={shopifyLoad?.cart}
          shopifyOrder={shopifyLoad?.context}
          missingShopifyProducts={shopifyLoad?.missingProducts}
          shopifyOrders={shopifyOrders}
          loyaltySettings={loyaltySettings}
          isStorePos={profile?.is_store_pos === true}
          cashierUserId={profile?.id}
        />
      </div>
    </div>
  );
}
