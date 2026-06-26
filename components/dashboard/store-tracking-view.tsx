"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreTrackingPeriodFilter } from "@/components/dashboard/store-tracking-period-filter";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import { MobileStatCard, MobileStatGrid, DesktopStatGrid } from "@/components/dashboard/mobile-stat-card";
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
  const lowStock = rows.reduce((s, r) => s + r.lowStockCount, 0);

  return (
    <>
      <MobileStatGrid>
        <MobileStatCard
          label={`CA · ${periodLabel}`}
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          variant="gold"
        />
        <MobileStatCard label="Ventes POS" value={String(totalSales)} icon={ShoppingBag} />
        <MobileStatCard
          label="Stock faible"
          value={String(lowStock)}
          icon={AlertTriangle}
          variant={lowStock > 0 ? "warning" : "success"}
        />
      </MobileStatGrid>
      <DesktopStatGrid>
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
            <AlertTriangle className="h-4 w-4" />
            Alertes stock faible
          </p>
          <p className="mt-1 text-2xl font-bold">{lowStock}</p>
        </Card>
      </DesktopStatGrid>
    </>
  );
}

export function StoreTrackingView({
  storeSnapshots,
  overviewByStore,
  selectedStoreId,
  selectedStoreLabel = "",
  hideStoreHeader = false,
}: {
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  selectedStoreId: string;
  selectedStoreLabel?: string;
  hideStoreHeader?: boolean;
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

  const trackingRows = useMemo(
    () => buildStoreTrackingRows(scopedSnapshots, overviewByStore, from, to),
    [scopedSnapshots, overviewByStore, from, to]
  );

  const filteredSnapshots = useMemo(
    () => scopedSnapshots.map((s) => filterStoreSnapshot(s, from, to)),
    [scopedSnapshots, from, to]
  );

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

      <StoreSnapshotsPanel
        snapshots={filteredSnapshots}
        overviewByStore={overviewByStore}
        periodLabel={periodLabel}
      />
    </div>
  );
}
