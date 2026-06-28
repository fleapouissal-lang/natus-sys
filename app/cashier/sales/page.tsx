import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  fetchCashierSales,
  fetchStoreSales,
} from "@/lib/sales/fetch-cashier-sales";
import { CashierSalesHistory } from "@/components/sales/cashier-sales-history";
import { getCashierSalesHistoryDateBounds } from "@/lib/sales/manager-sales-window";

export const dynamic = "force-dynamic";

export default async function CashierSalesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const isStorePos = profile?.is_store_pos === true;

  const historyBounds = getCashierSalesHistoryDateBounds();

  let sales: Awaited<ReturnType<typeof fetchCashierSales>>["sales"] = [];
  let error: string | null = null;

  if (profile && isStorePos && profile.store_id) {
    const result = await fetchStoreSales(supabase, profile.store_id, historyBounds);
    sales = result.sales;
    error = result.error;
  } else if (profile) {
    const result = await fetchCashierSales(supabase, profile.id, historyBounds);
    sales = result.sales;
    error = result.error;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isStorePos ? "Historique de vente" : "Mes ventes"}
        </h1>
        <p className="mt-1 text-muted">
          {isStorePos
            ? "Ventes du magasin — aujourd'hui et les 3 jours précédents"
            : "Vos ventes en caisse — aujourd'hui et les 3 jours précédents"}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossible de charger les ventes : {error}
        </p>
      )}

      <CashierSalesHistory
        initialSales={sales}
        mode={isStorePos ? "store" : "personal"}
        storeId={profile?.store_id ?? undefined}
        cashierId={isStorePos ? undefined : profile?.id}
        cashierName={
          isStorePos
            ? profile?.full_name || profile?.email || undefined
            : profile?.full_name || profile?.email || undefined
        }
        historyBounds={historyBounds}
      />
    </div>
  );
}
