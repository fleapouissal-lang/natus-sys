"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, Store as StoreIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { StoreTrackingView } from "@/components/dashboard/store-tracking-view";
import { DashboardStoreStatsPanel } from "@/components/dashboard/dashboard-store-stats-panel";
import { ManagerUnifiedDashboard } from "@/components/dashboard/manager-unified-dashboard";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import type {
  ActivityEntry,
  DashboardStats,
  Store,
  StoreOutOfStockProduct,
  StoreOverviewRow,
  StoreSnapshot,
} from "@/lib/types";

function ManagerDashboardTabsInner({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  storeSnapshots,
  overviewByStore,
  storeActivities,
  outOfStockProducts,
  storesWithStats = [],
}: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
  outOfStockProducts: StoreOutOfStockProduct[];
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  const pathname = usePathname();
  const isDirector = pathname.startsWith("/director");

  if (!isDirector) {
    return (
      <ManagerUnifiedDashboard
        stores={stores}
        selectedStoreId={selectedStoreId}
        selectedStoreLabel={selectedStoreLabel}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
        storeActivities={storeActivities}
        outOfStockProducts={outOfStockProducts}
        storesWithStats={storesWithStats}
      />
    );
  }

  const activityBase = "/director";
  const stockHref = (storeId: string) => `/director/stock?store=${storeId}`;

  const storeFilterProps = {
    stores,
    selectedStoreId,
    hideSelectedOnMobile: true,
  };

  const allStoresScopeLabel =
    stores.length === 1
      ? `${stores[0].name} — ${stores[0].city}`
      : `Tous les magasins (${stores.length})`;

  return (
    <div className="space-y-6 md:space-y-8">
      <Suspense fallback={null}>
        <div className="md:hidden">
          <StoreFilterBar {...storeFilterProps} layout="compact" className="p-3" />
        </div>
        <div className="hidden md:block">
          <StoreFilterBar {...storeFilterProps} />
        </div>
      </Suspense>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Suivi des magasins</h2>
        </div>

        {selectedStoreId ? (
          <StoreTrackingView
            storeSnapshots={storeSnapshots}
            overviewByStore={overviewByStore}
            selectedStoreId={selectedStoreId}
            selectedStoreLabel={selectedStoreLabel}
            hideStoreHeader
            allStores={stores}
            allStoresScopeLabel={allStoresScopeLabel}
            stockOnly={false}
            stockHref={stockHref}
          />
        ) : (
          <Card className="py-12 text-center text-muted">
            Sélectionnez un magasin pour voir le suivi
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Statistiques du stock</h2>
        </div>

        <DashboardStoreStatsPanel
          stores={stores}
          selectedStoreId={selectedStoreId}
          selectedStoreLabel={selectedStoreLabel}
          stats={stats}
          allStoresScopeLabel={allStoresScopeLabel}
          hideDescription
          stockOnly={false}
          overviewByStore={overviewByStore}
          stockHref={stockHref}
        />

        {selectedStoreId && (
          <RecentActivityPanel
            activities={storeActivities}
            title="Activité du magasin"
            description={selectedStoreLabel}
            descriptionClassName="hidden md:block"
            viewAllHref={`${activityBase}/activity?store=${selectedStoreId}`}
            limit={8}
          />
        )}
      </section>
    </div>
  );
}

export function ManagerDashboardTabs(props: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
  outOfStockProducts: StoreOutOfStockProduct[];
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardTabsInner {...props} />
    </Suspense>
  );
}
