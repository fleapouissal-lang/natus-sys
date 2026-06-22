import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  fetchCashierSales,
  fetchStoreSales,
} from "@/lib/sales/fetch-cashier-sales";
import { getActivePosOperator } from "@/lib/pos/operator-session";
import { CashierSalesHistory } from "@/components/sales/cashier-sales-history";

export const dynamic = "force-dynamic";

export default async function CashierSalesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const isStorePos = profile?.is_store_pos === true;

  let sales: Awaited<ReturnType<typeof fetchCashierSales>>["sales"] = [];
  let error: string | null = null;

  if (profile && isStorePos && profile.store_id) {
    const result = await fetchStoreSales(supabase, profile.store_id);
    sales = result.sales;
    error = result.error;
  } else if (profile) {
    const result = await fetchCashierSales(supabase, profile.id);
    sales = result.sales;
    error = result.error;
  }

  const activeOperator =
    profile && isStorePos ? await getActivePosOperator(profile) : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isStorePos ? "Ventes du magasin" : "Mes ventes"}
        </h1>
        <p className="mt-1 text-muted">
          {isStorePos
            ? "Toutes les ventes de la caisse — chaque ligne indique le caissier ayant encaissé"
            : "Historique de vos transactions — état des ventes et modes de paiement"}
        </p>
        {isStorePos && activeOperator?.operator && (
          <p className="mt-2 text-sm text-accent">
            Caissier connecté à la caisse :{" "}
            {activeOperator.operator.full_name || activeOperator.operator.email}
          </p>
        )}
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
      />
    </div>
  );
}
