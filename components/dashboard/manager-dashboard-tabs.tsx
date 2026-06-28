"use client";

import { usePathname } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";
import {
  DashboardPeriodFilter,
  type DashboardGlobalPeriod,
} from "@/components/dashboard/dashboard-period-filter";
import {
  DashboardStockPanel,
  overviewRowsToStockStores,
} from "@/components/dashboard/dashboard-stock-panel";
import { StoreOutOfStockPanel } from "@/components/dashboard/store-out-of-stock-panel";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import { ManagerUnifiedDashboard } from "@/components/dashboard/manager-unified-dashboard";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { toLocalDateKey } from "@/lib/utils";
import { resolveStoreTrackingRange } from "@/lib/store-tracking-period";
import { filterStoreSnapshot } from "@/lib/store-tracking-filter";
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

  const today = toLocalDateKey(new Date());
  const [period, setPeriod] = useState<DashboardGlobalPeriod>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const { from, to, label: periodLabel } = useMemo(
    () => resolveStoreTrackingRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const allStoreIds = useMemo(() => stores.map((s) => s.id), [stores]);
  const scopedStoreIds = useMemo(
    () => (selectedStoreId ? [selectedStoreId] : allStoreIds),
    [selectedStoreId, allStoreIds]
  );

  const filteredSnapshots = useMemo(() => {
    const base = selectedStoreId
      ? storeSnapshots.filter((s) => s.storeId === selectedStoreId)
      : storeSnapshots;
    return base.map((s) => filterStoreSnapshot(s, from, to));
  }, [selectedStoreId, storeSnapshots, from, to]);

  const stockRows = useMemo(
    () =>
      overviewRowsToStockStores(
        scopedStoreIds
          .map((id) => overviewByStore[id])
          .filter((row): row is StoreOverviewRow => Boolean(row)),
        { stockHref: (storeId) => `/director/stock?store=${storeId}`, storesWithStats }
      ),
    [scopedStoreIds, overviewByStore, storesWithStats]
  );

  const allStoresScopeLabel =
    stores.length === 1
      ? `${stores[0].name} — ${stores[0].city}`
      : `Tous les magasins (${stores.length})`;

  const scopeLabel = selectedStoreLabel || allStoresScopeLabel;

  const storeFilterProps = {
    stores,
    selectedStoreId,
    hideSelectedOnMobile: true,
  };

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

      <DashboardPeriodFilter
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        periodLabel={periodLabel}
        onPeriodChange={setPeriod}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <DashboardAnalyticsPanel
        storeIds={scopedStoreIds}
        scopeLabel={scopeLabel}
        allStoreIds={allStoreIds}
        allScopeLabel={allStoresScopeLabel}
        title="Performance globale"
        hidePeriodFilter
        controlledPeriod={period}
        controlledCustomFrom={customFrom}
        controlledCustomTo={customTo}
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Stock &amp; ruptures</h2>
        </div>

        <DashboardStockPanel
          scopeLabel={scopeLabel}
          storeRows={stockRows}
          stockSnapshots={filteredSnapshots}
          periodLabel={periodLabel}
          title="Synthèse du stock"
          outOfStockCount={selectedStoreId ? outOfStockProducts.length : undefined}
          singleStoreMode={Boolean(selectedStoreId)}
        />

        {selectedStoreId && (
          <StoreOutOfStockPanel
            products={outOfStockProducts}
            storeLabel={selectedStoreLabel}
            stockHref={`/director/stock?store=${selectedStoreId}`}
          />
        )}

        <StoreSnapshotsPanel
          snapshots={filteredSnapshots}
          overviewByStore={overviewByStore}
          periodLabel={periodLabel}
          stockOnly
        />
      </section>

      {selectedStoreId && (
        <RecentActivityPanel
          activities={storeActivities}
          title="Activité du magasin"
          description={selectedStoreLabel}
          descriptionClassName="hidden md:block"
          viewAllHref={`/director/activity?store=${selectedStoreId}`}
          limit={8}
        />
      )}
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
