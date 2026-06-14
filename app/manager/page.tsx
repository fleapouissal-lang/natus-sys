import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getDashboardStats } from "@/lib/dashboard";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
} from "lucide-react";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent || "bg-primary/15"}`}
        >
          <Icon className={`h-5 w-5 ${accent ? "text-black" : "text-primary"}`} />
        </div>
      </div>
    </Card>
  );
}

export default async function ManagerDashboard({
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
  const stats = storeId ? await getDashboardStats(storeId) : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-muted">
          Statistiques du magasin sélectionné
        </p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {stats && selectedStore ? (
        <>
          <p className="text-sm text-muted">
            Données pour <span className="font-medium text-foreground">{selectedStore.name}</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Ventes aujourd'hui"
              value={String(stats.todaySales)}
              subtitle={formatCurrency(stats.todayRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              title="Chiffre d'affaires total"
              value={formatCurrency(stats.totalRevenue)}
              subtitle={`${stats.totalSales} ventes`}
              icon={ShoppingBag}
              accent="bg-primary"
            />
            <StatCard
              title="Produits en catalogue"
              value={String(stats.totalProducts)}
              icon={Package}
            />
            <StatCard
              title="Stock faible"
              value={String(stats.lowStockCount)}
              subtitle="Produits < 10 unités"
              icon={AlertTriangle}
              accent={stats.lowStockCount > 0 ? "bg-primary/30" : undefined}
            />
          </div>
        </>
      ) : (
        <Card className="py-12 text-center text-muted">
          Sélectionnez un magasin pour voir les statistiques
        </Card>
      )}
    </div>
  );
}
