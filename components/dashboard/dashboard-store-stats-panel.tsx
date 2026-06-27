"use client";

import { Package } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";
import { MobileStatCard, MobileStatGrid, DesktopStatGrid } from "@/components/dashboard/mobile-stat-card";
import type { DashboardStats, Store } from "@/lib/types";

export function DashboardStoreStatsPanel({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  allStoresScopeLabel,
  hideDescription = false,
}: {
  stores: Pick<Store, "id" | "name" | "city">[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  allStoresScopeLabel: string;
  hideDescription?: boolean;
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

      <DashboardAnalyticsPanel
        storeIds={[selectedStoreId]}
        scopeLabel={selectedStoreLabel}
        allStoreIds={stores.map((s) => s.id)}
        allScopeLabel={allStoresScopeLabel}
      />

      {stats && (
        <>
          <MobileStatGrid>
            <MobileStatCard
              label="Catalogue"
              value={String(stats.totalProducts)}
              icon={Package}
            />
          </MobileStatGrid>
          <DesktopStatGrid>
            <Card>
              <p className="text-sm text-muted">Produits en catalogue</p>
              <p className="mt-1 text-2xl font-bold">{stats.totalProducts}</p>
            </Card>
          </DesktopStatGrid>
        </>
      )}
    </div>
  );
}
