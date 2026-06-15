"use client";

import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { StoreOverviewRow } from "@/lib/types";

export function StoreOverviewChart({
  rows,
  selectedStoreId,
  onStoreSelect,
}: {
  rows: StoreOverviewRow[];
  selectedStoreId: string;
  onStoreSelect?: (storeId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const maxWeekRevenue = Math.max(...rows.map((r) => r.weekRevenue), 1);

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
        description="Chiffre d'affaires sur 7 jours — cliquez pour sélectionner un magasin"
      />

      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const weekPct = Math.round((row.weekRevenue / maxWeekRevenue) * 100);
          const todayPct =
            row.weekRevenue > 0
              ? Math.round((row.todayRevenue / row.weekRevenue) * weekPct)
              : 0;
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
                  {formatCurrency(row.weekRevenue)}
                  <span className="ml-1 text-xs font-normal text-muted">/ 7 j</span>
                </p>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-page">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-champagne transition-all"
                  style={{ width: `${weekPct}%`, opacity: 0.45 }}
                />
                {todayPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-champagne transition-all"
                    style={{ width: `${todayPct}%` }}
                  />
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Aujourd&apos;hui : {formatCurrency(row.todayRevenue)} ({row.todaySales} vente
                  {row.todaySales !== 1 ? "s" : ""})
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

      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-champagne" />
          CA aujourd&apos;hui
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-champagne opacity-45" />
          CA 7 derniers jours
        </span>
      </div>
    </Card>
  );
}
