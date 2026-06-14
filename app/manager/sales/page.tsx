import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const { data: sales } = storeId
    ? await supabase
        .from("sales")
        .select("*, profiles(full_name, email), stores(name, city)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const totalRevenue =
    sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
        <p className="mt-1 text-muted">Historique par magasin</p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {selectedStore && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-muted">Total ventes — {selectedStore.name}</p>
              <p className="mt-1 text-2xl font-bold">{sales?.length || 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Chiffre d&apos;affaires</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(totalRevenue)}
              </p>
            </Card>
          </div>

          <Card padding={false}>
            <div className="p-6">
              <CardHeader
                title="Historique des ventes"
                description={`${selectedStore.name} — ${selectedStore.city}`}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-primary-light/50">
                    <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-muted">Caissier</th>
                    <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
                    <th className="px-6 py-3 text-left font-medium text-muted">Réf.</th>
                  </tr>
                </thead>
                <tbody>
                  {sales?.map((sale) => (
                    <tr key={sale.id} className="border-b border-border">
                      <td className="px-6 py-4">{formatDate(sale.created_at)}</td>
                      <td className="px-6 py-4">
                        {(sale.profiles as { full_name: string | null; email: string })?.full_name ||
                          (sale.profiles as { email: string })?.email}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge>{sale.id.slice(0, 8)}</Badge>
                      </td>
                    </tr>
                  ))}
                  {(!sales || sales.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted">
                        Aucune vente pour ce magasin
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
