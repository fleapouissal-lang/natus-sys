import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ManagerSalesHistory } from "@/components/sales/manager-sales-history";
import { Card } from "@/components/ui/card";
import type { Sale } from "@/lib/types";

const SALE_SELECT =
  "*, profiles(full_name, email), stores(name, city), sale_items(id, quantity, unit_price, products(name, barcode))";

export default async function SalesPage({
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

  const supabase = await createClient();
  const { data } = storeId
    ? await supabase
        .from("sales")
        .select(SALE_SELECT)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] };

  const sales = (data || []) as Sale[];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
        <p className="mt-1 text-muted">Historique par magasin</p>
      </div>

      {selectedStore ? (
        <Suspense fallback={null}>
          <ManagerSalesHistory
            sales={sales}
            storeLabel={`${selectedStore.name} — ${selectedStore.city}`}
            stores={stores}
            selectedStoreId={storeId}
          />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={null}>
            <StoreFilterBar stores={stores} selectedStoreId={storeId} />
          </Suspense>
          <Card className="py-12 text-center text-muted">
            Sélectionnez un magasin pour voir les ventes
          </Card>
        </>
      )}
    </div>
  );
}
