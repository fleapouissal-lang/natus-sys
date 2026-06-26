import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { getStoreProductSalesQuantities } from "@/lib/pos/product-sales-rank.server";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
import { getStorePosAccount } from "@/lib/pos/operator-session";
import { Card } from "@/components/ui/card";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; switch?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();

  if (profile?.role === "manager") {
    redirect("/manager");
  }

  if (profile?.role === "hub") {
    redirect("/hub");
  }

  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);

  const storeId =
    profile?.role === "cashier"
      ? profile.store_id || resolveSelectedStoreId(stores, storeParam)
      : resolveSelectedStoreId(stores, storeParam);

  const selectedStore = getSelectedStore(stores, storeId);
  const showStoreFilter =
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
  const productSalesQty = storeId
    ? await getStoreProductSalesQuantities(storeId)
    : {};
  const loyaltySettings = await getLoyaltySettings();

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

      <div className="min-h-0 flex-1">
        <PosTerminal
          products={products}
          role={profile?.role || "cashier"}
          cashierName={cashierName}
          stores={stores}
          defaultStoreId={storeId}
          storeName={selectedStore?.name}
          loyaltySettings={loyaltySettings}
          isStorePos={profile?.is_store_pos === true}
          cashierUserId={profile?.id}
          productSalesQty={productSalesQty}
        />
      </div>
    </div>
  );
}
