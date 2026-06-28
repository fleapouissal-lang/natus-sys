import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, isManager } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { getManagerSalesHistoryDateBounds } from "@/lib/sales/manager-sales-window";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ManagerSalesHistory } from "@/components/sales/manager-sales-history";
import { Card } from "@/components/ui/card";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import type { Sale } from "@/lib/types";

export default async function ManagementSalesContent({
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
  const managerView = profile ? isManager(profile) : false;
  const historyBounds = managerView ? getManagerSalesHistoryDateBounds() : null;

  const supabase = await createClient();
  let salesQuery = storeId
    ? supabase
        .from("sales")
        .select(SALE_HISTORY_SELECT)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
    : null;

  if (salesQuery && historyBounds) {
    salesQuery = salesQuery
      .gte("created_at", `${historyBounds.minDate}T00:00:00`)
      .lte("created_at", `${historyBounds.maxDate}T23:59:59.999`);
  } else if (salesQuery) {
    salesQuery = salesQuery.limit(300);
  }

  const { data } = salesQuery ? await salesQuery : { data: [] };

  const sales = (data || []) as Sale[];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
        <p className="mt-1 text-muted">
          {managerView
            ? "Ventes du jour et des 3 jours précédents"
            : "Historique par magasin"}
        </p>
      </div>

      {selectedStore ? (
        <Suspense fallback={null}>
          <ManagerSalesHistory
            sales={sales}
            storeLabel={`${selectedStore.name} — ${selectedStore.city}`}
            stores={stores}
            selectedStoreId={storeId}
            historyBounds={historyBounds}
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
