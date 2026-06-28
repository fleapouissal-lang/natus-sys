"use client";

import { Suspense, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { StoreTrackingPeriodFilter } from "@/components/dashboard/store-tracking-period-filter";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import {
  DashboardStockPanel,
  overviewRowsToStockStores,
} from "@/components/dashboard/dashboard-stock-panel";
import { StoreOutOfStockPanel } from "@/components/dashboard/store-out-of-stock-panel";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { toLocalDateKey } from "@/lib/utils";
import { filterStoreSnapshot } from "@/lib/store-tracking-filter";
import {
  resolveStoreTrackingRange,
  type StoreTrackingPreset,
} from "@/lib/store-tracking-period";
import type {
  ActivityEntry,
  Store,
  StoreOutOfStockProduct,
  StoreOverviewRow,
  StoreSnapshot,
} from "@/lib/types";

export function ManagerUnifiedDashboard({
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
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
  outOfStockProducts: StoreOutOfStockProduct[];
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  const today = toLocalDateKey(new Date());
  const [preset, setPreset] = useState<StoreTrackingPreset>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const stockHref = selectedStoreId
    ? `/manager/stock?store=${selectedStoreId}`
    : undefined;

  const scopedSnapshots = useMemo(() => {
    if (!selectedStoreId) return [];
    return storeSnapshots.filter((snapshot) => snapshot.storeId === selectedStoreId);
  }, [selectedStoreId, storeSnapshots]);

  const { from, to, label: periodLabel } = useMemo(
    () => resolveStoreTrackingRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const filteredSnapshots = useMemo(
    () => scopedSnapshots.map((snapshot) => filterStoreSnapshot(snapshot, from, to)),
    [scopedSnapshots, from, to]
  );

  const stockStoreRows = useMemo(
    () =>
      overviewRowsToStockStores(
        selectedStoreId && overviewByStore[selectedStoreId]
          ? [overviewByStore[selectedStoreId]]
          : [],
        { stockHref: (id) => `/manager/stock?store=${id}`, storesWithStats }
      ),
    [selectedStoreId, overviewByStore, storesWithStats]
  );

  if (stores.length === 0) {
    return (
      <Card className="py-12 text-center text-muted">
        Aucun magasin associé à votre compte.
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={selectedStoreId} />
      </Suspense>

      {!selectedStoreId ? (
        <Card className="py-12 text-center text-muted">
          Sélectionnez un magasin pour afficher le suivi et le stock.
        </Card>
      ) : (
        <>
          <Card padding={false} className="overflow-hidden border-primary/20">
            <div className="bg-gradient-to-r from-champagne/25 to-surface px-4 py-5 sm:px-6">
              <CardHeader
                title={selectedStoreLabel.split(" — ")[0] || selectedStoreLabel}
                description={`${selectedStoreLabel.includes(" — ") ? selectedStoreLabel.split(" — ").slice(1).join(" — ") : selectedStoreLabel} · ${periodLabel}`}
              />
            </div>
          </Card>

          <StoreTrackingPeriodFilter
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            periodLabel={periodLabel}
            onPresetChange={setPreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          <DashboardStockPanel
            scopeLabel={selectedStoreLabel}
            storeRows={stockStoreRows}
            stockSnapshots={filteredSnapshots}
            periodLabel={periodLabel}
            title="Stock & indicateurs"
            outOfStockCount={outOfStockProducts.length}
            singleStoreMode
          />

          <StoreOutOfStockPanel
            products={outOfStockProducts}
            storeLabel={selectedStoreLabel}
            stockHref={stockHref}
          />

          <StoreSnapshotsPanel
            snapshots={filteredSnapshots}
            overviewByStore={overviewByStore}
            periodLabel={periodLabel}
            stockOnly
          />

          <RecentActivityPanel
            activities={storeActivities}
            title="Activité récente"
            description={`${selectedStoreLabel} · ${periodLabel}`}
            viewAllHref={`/manager/activity?store=${selectedStoreId}`}
            limit={8}
          />
        </>
      )}
    </div>
  );
}
