import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { fetchCashierSales } from "@/lib/sales/fetch-cashier-sales";
import { CashierSalesHistory } from "@/components/sales/cashier-sales-history";

export const dynamic = "force-dynamic";

export default async function CashierSalesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { sales, error } = profile
    ? await fetchCashierSales(supabase, profile.id)
    : { sales: [], error: null };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mes ventes</h1>
        <p className="mt-1 text-muted">
          Historique de vos transactions — état des ventes et modes de paiement
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossible de charger les ventes : {error}
        </p>
      )}

      <CashierSalesHistory
        initialSales={sales}
        cashierId={profile?.id}
        cashierName={profile?.full_name || profile?.email || undefined}
      />
    </div>
  );
}
