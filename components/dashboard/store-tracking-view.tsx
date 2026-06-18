"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StoreTrackingPeriodFilter } from "@/components/dashboard/store-tracking-period-filter";
import { StoreOverviewChart } from "@/components/dashboard/store-overview-chart";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import type { StoreOverviewRow, StoreSnapshot } from "@/lib/types";
import {
  buildStoreTrackingRows,
  filterStoreSnapshot,
} from "@/lib/store-tracking-filter";
import {
  resolveStoreTrackingRange,
  type StoreTrackingPreset,
} from "@/lib/store-tracking-period";

function StoreTrackingSummaryCards({
  rows,
  periodLabel,
}: {
  rows: ReturnType<typeof buildStoreTrackingRows>;
  periodLabel: string;
}) {
  if (rows.length === 0) return null;

  const totalRevenue = rows.reduce((s, r) => s + r.periodRevenue, 0);
  const totalSales = rows.reduce((s, r) => s + r.periodSales, 0);
  const totalOrders = rows.reduce((s, r) => s + r.periodOrders, 0);
  const lowStock = rows.reduce((s, r) => s + r.lowStockCount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <p className="text-sm text-muted">CA — {periodLabel}</p>
        <p className="mt-1 text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Ventes POS</p>
        <p className="mt-1 text-2xl font-bold">{totalSales}</p>
      </Card>
      <Card>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <ShoppingCart className="h-4 w-4" />
          Commandes web
        </p>
        <p className="mt-1 text-2xl font-bold">{totalOrders}</p>
      </Card>
      <Card>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <AlertTriangle className="h-4 w-4" />
          Alertes stock faible
        </p>
        <p className="mt-1 text-2xl font-bold">{lowStock}</p>
      </Card>
    </div>
  );
}

export function StoreTrackingView({
  storeSnapshots,
  overviewByStore,
  selectedStoreId,
  onStoreSelect,
}: {
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  selectedStoreId: string;
  onStoreSelect: (storeId: string) => void;
}) {
  const today = toLocalDateKey(new Date());
  const [preset, setPreset] = useState<StoreTrackingPreset>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const { from, to, label: periodLabel } = useMemo(
    () => resolveStoreTrackingRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const trackingRows = useMemo(
    () => buildStoreTrackingRows(storeSnapshots, overviewByStore, from, to),
    [storeSnapshots, overviewByStore, from, to]
  );

  const filteredSnapshots = useMemo(
    () => storeSnapshots.map((s) => filterStoreSnapshot(s, from, to)),
    [storeSnapshots, from, to]
  );

  if (storeSnapshots.length === 0) {
    return (
      <Card className="py-12 text-center text-muted">Aucun magasin à suivre</Card>
    );
  }

  return (
    <div className="space-y-6">
      <StoreTrackingPeriodFilter
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        periodLabel={periodLabel}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <StoreTrackingSummaryCards rows={trackingRows} periodLabel={periodLabel} />

      <StoreOverviewChart
        rows={trackingRows}
        periodLabel={periodLabel}
        selectedStoreId={selectedStoreId}
        onStoreSelect={onStoreSelect}
      />

      <StoreSnapshotsPanel
        snapshots={filteredSnapshots}
        overviewByStore={overviewByStore}
        periodLabel={periodLabel}
      />
    </div>
  );
}
