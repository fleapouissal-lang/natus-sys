"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Store, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StoreTrackingPeriodFilter } from "@/components/dashboard/store-tracking-period-filter";
import {
  DashboardStockPanel,
  overviewRowsToStockStores,
} from "@/components/dashboard/dashboard-stock-panel";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import { toLocalDateKey } from "@/lib/utils";
import type { Store as StoreType, StoreOverviewRow, StoreSnapshot } from "@/lib/types";
import {
  filterStoreSnapshot,
} from "@/lib/store-tracking-filter";
import {
  resolveStoreTrackingRange,
  type StoreTrackingPreset,
} from "@/lib/store-tracking-period";

export function HubDashboardPanel({
  city,
  hubStoreName,
  hubStoreId,
  hubOverview,
  retailStores,
  storeSnapshots,
  overviewByStore,
  storesWithStats = [],
}: {
  city: string;
  hubStoreName?: string;
  hubStoreId?: string;
  hubOverview?: StoreOverviewRow | null;
  retailStores: StoreType[];
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  const today = toLocalDateKey(new Date());
  const [selectedStoreId, setSelectedStoreId] = useState(retailStores[0]?.id ?? "");
  const [preset, setPreset] = useState<StoreTrackingPreset>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const selectedStore = retailStores.find((s) => s.id === selectedStoreId);
  const selectedStoreLabel = selectedStore
    ? `${selectedStore.name} — ${selectedStore.city}`
    : "";

  const allScopeLabel = `Magasins assignés · ${city} (${retailStores.length})`;

  const scopedSnapshots = useMemo(() => {
    if (!selectedStoreId) return storeSnapshots;
    return storeSnapshots.filter((s) => s.storeId === selectedStoreId);
  }, [selectedStoreId, storeSnapshots]);

  const { from, to, label: periodLabel } = useMemo(
    () => resolveStoreTrackingRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const filteredSnapshots = useMemo(
    () => scopedSnapshots.map((s) => filterStoreSnapshot(s, from, to)),
    [scopedSnapshots, from, to]
  );

  const retailStockRows = useMemo(
    () =>
      overviewRowsToStockStores(
        retailStores
          .map((store) => overviewByStore[store.id])
          .filter((row): row is StoreOverviewRow => Boolean(row)),
        {
          stockHref: (storeId) => `/hub/stock?store=${storeId}`,
          storesWithStats,
        }
      ),
    [retailStores, overviewByStore, storesWithStats]
  );

  const hubStockRow = useMemo(() => {
    if (!hubStoreId || !hubOverview) return null;
    return {
      storeId: hubStoreId,
      storeName: hubStoreName || hubOverview.storeName,
      totalUnits: hubOverview.totalUnits,
      lowStockCount: hubOverview.lowStockCount,
      productCount: storesWithStats.find((s) => s.id === hubStoreId)?.productCount,
      isHub: true,
      stockHref: "/hub/stock-transfers?tab=new",
    };
  }, [hubStoreId, hubStoreName, hubOverview, storesWithStats]);

  return (
    <div className="space-y-6">
      {retailStores.length > 1 && (
        <div className="natus-filter-bar overflow-visible rounded-2xl p-4 md:rounded-lg">
          <p className="mb-3 text-sm font-medium text-primary">Magasin</p>
          <div className="flex flex-wrap gap-2">
            {retailStores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreId(store.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedStoreId === store.id
                    ? "border-primary bg-champagne text-black"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {retailStores.length === 0 ? (
        <Card className="py-12 text-center text-muted">Aucun magasin assigné au dépôt</Card>
      ) : (
        <>
          <DashboardStockPanel
            scopeLabel={selectedStoreLabel || allScopeLabel}
            storeRows={
              selectedStoreId
                ? retailStockRows.filter((row) => row.storeId === selectedStoreId)
                : retailStockRows
            }
            hubRow={selectedStoreId ? null : hubStockRow}
            stockSnapshots={filteredSnapshots}
            periodLabel={periodLabel}
            title="Statistiques stock réseau"
          />

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
            stockOnly
          />
        </>
      )}

      {hubStoreName && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{hubStoreName}</p>
            <p className="text-sm text-muted">Entrepôt central — {city}</p>
          </div>
          <Link
            href="/hub/stock-transfers?tab=new"
            className="inline-flex items-center gap-2 rounded-md border border-primary bg-champagne px-4 py-2 text-sm font-medium text-black hover:brightness-95"
          >
            <Warehouse className="h-4 w-4" />
            Gérer le stock dépôt
          </Link>
        </Card>
      )}

      {retailStores.length > 0 && (
        <Card padding={false}>
          <div className="border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Store className="h-5 w-5 text-primary" />
              Magasins — {city}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {retailStores.map((store) => (
              <li key={store.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{store.name}</p>
                  {store.address && <p className="text-sm text-muted">{store.address}</p>}
                </div>
                <Link
                  href={`/hub/stock?store=${store.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Stock →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
