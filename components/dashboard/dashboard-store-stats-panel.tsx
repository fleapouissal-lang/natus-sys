"use client";

import { Package } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  DashboardStockPanel,
  overviewRowsToStockStores,
} from "@/components/dashboard/dashboard-stock-panel";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";
import { MobileStatCard, MobileStatGrid, DesktopStatGrid } from "@/components/dashboard/mobile-stat-card";
import type { DashboardStats, Store, StoreOverviewRow } from "@/lib/types";

export function DashboardStoreStatsPanel({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  allStoresScopeLabel,
  hideDescription = false,
  stockOnly = false,
  overviewByStore = {},
  stockHref,
}: {
  stores: Pick<Store, "id" | "name" | "city">[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  allStoresScopeLabel: string;
  hideDescription?: boolean;
  stockOnly?: boolean;
  overviewByStore?: Record<string, StoreOverviewRow>;
  stockHref?: (storeId: string) => string;
}) {
  if (!selectedStoreId) {
    return (
      <p className="rounded-lg border border-border bg-surface px-6 py-12 text-center text-muted">
        Sélectionnez un magasin pour voir les statistiques
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Statistiques du magasin"
            description={hideDescription ? undefined : selectedStoreLabel}
            descriptionClassName={hideDescription ? "hidden md:block" : undefined}
          />
        </div>
      </Card>

      {stockOnly ? (
        <DashboardStockPanel
          scopeLabel={selectedStoreLabel}
          storeRows={overviewRowsToStockStores(
            overviewByStore[selectedStoreId]
              ? [overviewByStore[selectedStoreId]]
              : [],
            { stockHref }
          )}
          title="Statistiques stock du magasin"
        />
      ) : (
        <DashboardAnalyticsPanel
          storeIds={[selectedStoreId]}
          scopeLabel={selectedStoreLabel}
          allStoreIds={stores.map((s) => s.id)}
          allScopeLabel={allStoresScopeLabel}
        />
      )}

      {stats && (
        <>
          <MobileStatGrid>
            <MobileStatCard
              label={stockOnly ? "Alertes stock faible" : "Catalogue"}
              value={String(stockOnly ? stats.lowStockCount : stats.totalProducts)}
              icon={Package}
            />
          </MobileStatGrid>
          <DesktopStatGrid>
            <Card>
              <p className="text-sm text-muted">
                {stockOnly ? "Produits en alerte stock faible" : "Produits en catalogue"}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {stockOnly ? stats.lowStockCount : stats.totalProducts}
              </p>
            </Card>
          </DesktopStatGrid>
        </>
      )}
    </div>
  );
}
