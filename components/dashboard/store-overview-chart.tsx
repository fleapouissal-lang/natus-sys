"use client";

import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { StoreTrackingPeriodRow } from "@/lib/store-tracking-filter";

export function StoreOverviewChart({
  rows,
  periodLabel,
  selectedStoreId,
  onStoreSelect,
}: {
  rows: StoreTrackingPeriodRow[];
  periodLabel: string;
  selectedStoreId: string;
  onStoreSelect?: (storeId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const maxRevenue = Math.max(...rows.map((r) => r.periodRevenue), 1);

  function selectStore(storeId: string) {
    if (onStoreSelect) {
      onStoreSelect(storeId);
      return;
    }
    const params = new URLSearchParams();
    params.set("store", storeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Suivi des magasins"
        description={`Chiffre d'affaires — ${periodLabel} · cliquez pour ouvrir les statistiques`}
      />

      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const pct = Math.round((row.periodRevenue / maxRevenue) * 100);
          const selected = row.storeId === selectedStoreId;

          return (
            <button
              key={row.storeId}
              type="button"
              onClick={() => selectStore(row.storeId)}
              className={`w-full rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{row.storeName}</p>
                <p className="text-sm font-medium text-primary">
                  {formatCurrency(row.periodRevenue)}
                </p>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-page">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-champagne transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  {row.periodSales} vente{row.periodSales !== 1 ? "s" : ""} POS
                </span>
                <span>
                  {row.periodOrders} commande{row.periodOrders !== 1 ? "s" : ""} web
                </span>
                <span>
                  {row.periodStockActions} action
                  {row.periodStockActions !== 1 ? "s" : ""} stock
                </span>
                <span>{row.totalUnits} unités en stock</span>
                {row.lowStockCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {row.lowStockCount} stock faible
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
