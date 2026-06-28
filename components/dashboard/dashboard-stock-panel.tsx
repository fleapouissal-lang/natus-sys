"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Package, PackageX, Store, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StoreOverviewRow, StoreSnapshot } from "@/lib/types";

export type DashboardStockStoreRow = {
  storeId: string;
  storeName: string;
  totalUnits: number;
  lowStockCount: number;
  productCount?: number;
  isHub?: boolean;
  stockHref?: string;
};

function aggregateRows(rows: DashboardStockStoreRow[]) {
  return rows.reduce(
    (acc, row) => ({
      totalUnits: acc.totalUnits + row.totalUnits,
      lowStockCount: acc.lowStockCount + row.lowStockCount,
      inStockRefs: acc.inStockRefs + (row.productCount ?? 0),
    }),
    { totalUnits: 0, lowStockCount: 0, inStockRefs: 0 }
  );
}

export function DashboardStockPanel({
  scopeLabel,
  storeRows,
  hubRow,
  stockSnapshots = [],
  periodLabel,
  title = "Statistiques stock",
  outOfStockCount,
  singleStoreMode = false,
}: {
  scopeLabel: string;
  storeRows: DashboardStockStoreRow[];
  hubRow?: DashboardStockStoreRow | null;
  stockSnapshots?: StoreSnapshot[];
  periodLabel?: string;
  title?: string;
  outOfStockCount?: number;
  singleStoreMode?: boolean;
}) {
  const retailAgg = useMemo(() => aggregateRows(storeRows), [storeRows]);
  const hubAgg = hubRow ? aggregateRows([hubRow]) : null;
  const networkAgg = useMemo(
    () => aggregateRows(hubRow ? [...storeRows, hubRow] : storeRows),
    [storeRows, hubRow]
  );

  const periodStockActions = useMemo(
    () =>
      stockSnapshots.reduce((sum, snapshot) => sum + snapshot.recentStockAdds.length, 0),
    [stockSnapshots]
  );

  const sortedStores = useMemo(
    () =>
      [...storeRows].sort((a, b) => {
        if (b.lowStockCount !== a.lowStockCount) {
          return b.lowStockCount - a.lowStockCount;
        }
        return b.totalUnits - a.totalUnits;
      }),
    [storeRows]
  );

  const ruptureCount = outOfStockCount ?? 0;

  if (storeRows.length === 0 && !hubRow) {
    return (
      <Card className="py-12 text-center text-muted">
        Aucun magasin à afficher pour le stock
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding={false} className="overflow-hidden border-primary/20">
        <div className="border-b border-border bg-gradient-to-r from-champagne/30 to-surface px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">{scopeLabel}</p>
          {periodLabel && (
            <p className="mt-0.5 text-xs text-muted">
              Mouvements stock — {periodLabel}
              {periodStockActions > 0
                ? ` · ${periodStockActions} action${periodStockActions !== 1 ? "s" : ""}`
                : ""}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Unités en stock
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{networkAgg.totalUnits}</p>
          <p className="mt-1 text-xs text-muted">
            {singleStoreMode
              ? "Magasin sélectionné"
              : hubRow
                ? "Dépôt + magasins assignés"
                : "Magasins du périmètre"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Alertes stock faible
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            {networkAgg.lowStockCount}
            {networkAgg.lowStockCount > 0 && (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
          </p>
          <p className="mt-1 text-xs text-muted">Produits entre 1 et 9 unités</p>
        </Card>
        <Card className={ruptureCount > 0 ? "border-danger/30 bg-danger/5" : undefined}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Ruptures de stock
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
            {ruptureCount}
            {ruptureCount > 0 && <PackageX className="h-5 w-5 text-danger" />}
          </p>
          <p className="mt-1 text-xs text-muted">Produits à 0 unité</p>
        </Card>
        {!singleStoreMode && (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Magasins suivis
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{storeRows.length}</p>
            <p className="mt-1 text-xs text-muted">
              {retailAgg.totalUnits} unité{retailAgg.totalUnits !== 1 ? "s" : ""} retail
            </p>
          </Card>
        )}
        {singleStoreMode ? (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Références en stock
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{retailAgg.inStockRefs}</p>
            <p className="mt-1 text-xs text-muted">Produits avec stock &gt; 0</p>
          </Card>
        ) : hubRow ? (
          <Card className="border-primary/25 bg-champagne/10">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Stock dépôt
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{hubAgg?.totalUnits ?? 0}</p>
            <p className="mt-1 text-xs text-muted">
              {hubRow.lowStockCount} alerte{hubRow.lowStockCount !== 1 ? "s" : ""}
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Références en stock
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{retailAgg.inStockRefs}</p>
            <p className="mt-1 text-xs text-muted">Produits avec stock &gt; 0</p>
          </Card>
        )}
      </div>

      {hubRow && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/20">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Warehouse className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-semibold">{hubRow.storeName}</p>
              <p className="text-sm text-muted">
                {hubRow.totalUnits} unités · {hubRow.lowStockCount} alerte
                {hubRow.lowStockCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {hubRow.stockHref && (
            <Link
              href={hubRow.stockHref}
              className="text-sm font-medium text-primary hover:underline"
            >
              Gérer le dépôt →
            </Link>
          )}
        </Card>
      )}

      {sortedStores.length > 0 && !singleStoreMode && (
        <Card padding={false}>
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Store className="h-4 w-4 text-primary" />
              Stock par magasin
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium sm:px-5">Magasin</th>
                  <th className="px-4 py-2 font-medium sm:px-5">Unités</th>
                  <th className="px-4 py-2 font-medium sm:px-5">Alertes</th>
                  <th className="px-4 py-2 font-medium sm:px-5">Statut</th>
                  <th className="px-4 py-2 font-medium sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {sortedStores.map((row) => (
                  <tr key={row.storeId} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium sm:px-5">{row.storeName}</td>
                    <td className="px-4 py-2.5 tabular-nums sm:px-5">{row.totalUnits}</td>
                    <td className="px-4 py-2.5 tabular-nums sm:px-5">{row.lowStockCount}</td>
                    <td className="px-4 py-2.5 sm:px-5">
                      <Badge variant={row.lowStockCount > 0 ? "warning" : "success"}>
                        {row.lowStockCount > 0 ? "À surveiller" : "OK"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right sm:px-5">
                      {row.stockHref && (
                        <Link
                          href={row.stockHref}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Stock →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function overviewRowsToStockStores(
  rows: StoreOverviewRow[],
  options?: {
    stockHref?: (storeId: string) => string;
    storesWithStats?: Array<{ id: string; productCount?: number }>;
  }
): DashboardStockStoreRow[] {
  const productCountById = new Map(
    (options?.storesWithStats || []).map((s) => [s.id, s.productCount ?? 0])
  );

  return rows.map((row) => ({
    storeId: row.storeId,
    storeName: row.storeName,
    totalUnits: row.totalUnits,
    lowStockCount: row.lowStockCount,
    productCount: productCountById.get(row.storeId),
    stockHref: options?.stockHref?.(row.storeId),
  }));
}
