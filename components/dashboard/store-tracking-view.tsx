"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreTrackingPeriodFilter } from "@/components/dashboard/store-tracking-period-filter";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import {
  DashboardStockPanel,
  overviewRowsToStockStores,
} from "@/components/dashboard/dashboard-stock-panel";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";
import { toLocalDateKey } from "@/lib/utils";
import type { Store, StoreOverviewRow, StoreSnapshot } from "@/lib/types";
import {
  filterStoreSnapshot,
} from "@/lib/store-tracking-filter";
import {
  resolveStoreTrackingRange,
  type StoreTrackingPreset,
} from "@/lib/store-tracking-period";

export function StoreTrackingView({
  storeSnapshots,
  overviewByStore,
  selectedStoreId,
  selectedStoreLabel = "",
  hideStoreHeader = false,
  allStores = [],
  allStoresScopeLabel = "",
  stockOnly = false,
  stockHref,
}: {
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  selectedStoreId: string;
  selectedStoreLabel?: string;
  hideStoreHeader?: boolean;
  allStores?: Pick<Store, "id" | "name" | "city">[];
  allStoresScopeLabel?: string;
  stockOnly?: boolean;
  stockHref?: (storeId: string) => string;
}) {
  const today = toLocalDateKey(new Date());
  const [preset, setPreset] = useState<StoreTrackingPreset>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const scopedSnapshots = useMemo(() => {
    if (!selectedStoreId) return storeSnapshots;
    return storeSnapshots.filter((snapshot) => snapshot.storeId === selectedStoreId);
  }, [selectedStoreId, storeSnapshots]);

  const { from, to, label: periodLabel } = useMemo(
    () => resolveStoreTrackingRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const filteredSnapshots = useMemo(
    () => scopedSnapshots.map((s) => filterStoreSnapshot(s, from, to)),
    [scopedSnapshots, from, to]
  );

  const stockStoreRows = useMemo(() => {
    const ids = selectedStoreId
      ? [selectedStoreId]
      : allStores.map((s) => s.id);
    return overviewRowsToStockStores(
      ids
        .map((id) => overviewByStore[id])
        .filter((row): row is StoreOverviewRow => Boolean(row)),
      { stockHref }
    );
  }, [selectedStoreId, allStores, overviewByStore, stockHref]);

  const stockScopeLabel =
    selectedStoreLabel ||
    allStoresScopeLabel ||
    `${allStores.length} magasin${allStores.length !== 1 ? "s" : ""}`;

  if (storeSnapshots.length === 0) {
    return (
      <Card className="py-12 text-center text-muted">Aucun magasin à suivre</Card>
    );
  }

  if (selectedStoreId && scopedSnapshots.length === 0) {
    return (
      <Card className="py-12 text-center text-muted">
        Magasin introuvable ou sans activité récente
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {selectedStoreLabel && !hideStoreHeader && (
        <Card padding={false}>
          <div className="p-6">
            <CardHeader
              title="Suivi du magasin"
              description={selectedStoreLabel}
            />
          </div>
        </Card>
      )}

      {stockOnly ? (
        <DashboardStockPanel
          scopeLabel={stockScopeLabel}
          storeRows={stockStoreRows}
          stockSnapshots={filteredSnapshots}
          periodLabel={periodLabel}
          title="Statistiques stock"
        />
      ) : (
        <DashboardAnalyticsPanel
          storeIds={selectedStoreId ? [selectedStoreId] : allStores.map((s) => s.id)}
          scopeLabel={stockScopeLabel}
          allStoreIds={allStores.map((s) => s.id)}
          allScopeLabel={allStoresScopeLabel}
          title="Performance & analytique"
        />
      )}

      <StoreTrackingPeriodFilter
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        periodLabel={periodLabel}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <StoreSnapshotsPanel
        snapshots={filteredSnapshots}
        overviewByStore={overviewByStore}
        periodLabel={periodLabel}
        stockOnly={stockOnly}
      />
    </div>
  );
}
