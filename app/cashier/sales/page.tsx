import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { CashierSalesHistory } from "@/components/sales/cashier-sales-history";
import type { Sale } from "@/lib/types";

export default async function CashierSalesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = profile
    ? await supabase
        .from("sales")
        .select(
          "*, profiles(full_name, email), stores(name, city), sale_items(id, quantity, unit_price, products(name, barcode))"
        )
        .eq("cashier_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] };

  const sales = (data || []) as Sale[];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mes ventes</h1>
        <p className="mt-1 text-muted">
          Historique de vos transactions — état des ventes et modes de paiement
        </p>
      </div>

      <CashierSalesHistory sales={sales} />
    </div>
  );
}
