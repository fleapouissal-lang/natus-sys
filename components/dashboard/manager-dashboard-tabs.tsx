"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  BarChart3,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { StoreOverviewChart } from "@/components/dashboard/store-overview-chart";
import { StoreSnapshotsPanel } from "@/components/dashboard/store-snapshots-panel";
import { formatCurrency, cn } from "@/lib/utils";
import type {
  DashboardStats,
  Store,
  StoreOverviewRow,
  StoreSnapshot,
} from "@/lib/types";

type DashboardTab = "suivi" | "stats";

const TABS: {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "suivi", label: "Suivi des magasins", icon: Store },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center",
            accent || "bg-primary/15"
          )}
        >
          <Icon className={cn("h-5 w-5", accent ? "text-black" : "text-primary")} />
        </div>
      </div>
    </Card>
  );
}

function StoreSummaryCards({ rows }: { rows: StoreOverviewRow[] }) {
  if (rows.length === 0) return null;

  const totalWeek = rows.reduce((s, r) => s + r.weekRevenue, 0);
  const totalToday = rows.reduce((s, r) => s + r.todaySales, 0);
  const lowStock = rows.reduce((s, r) => s + r.lowStockCount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <p className="text-sm text-muted">CA 7 jours — tous magasins</p>
        <p className="mt-1 text-2xl font-bold">{formatCurrency(totalWeek)}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Ventes aujourd&apos;hui</p>
        <p className="mt-1 text-2xl font-bold">{totalToday}</p>
      </Card>
      <Card>
        <p className="text-sm text-muted">Alertes stock faible</p>
        <p className="mt-1 text-2xl font-bold">{lowStock}</p>
      </Card>
    </div>
  );
}

function ManagerDashboardTabsInner({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  storeOverview,
  storeSnapshots,
  overviewByStore,
}: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeOverview: StoreOverviewRow[];
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DashboardTab =
    tabParam === "stats" || tabParam === "suivi" ? tabParam : "suivi";

  function setTab(tab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex w-full border border-primary/30 bg-background p-1 sm:w-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer sm:flex-initial sm:px-6",
              activeTab === id
                ? "bg-champagne text-black"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "suivi" && (
        <div className="space-y-6">
          <StoreSummaryCards rows={storeOverview} />
          {storeOverview.length > 0 ? (
            <>
              <StoreOverviewChart
                rows={storeOverview}
                selectedStoreId={selectedStoreId}
                onStoreSelect={(storeId) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("store", storeId);
                  params.set("tab", "stats");
                  router.push(`${pathname}?${params.toString()}`);
                }}
              />
              <StoreSnapshotsPanel
                snapshots={storeSnapshots}
                overviewByStore={overviewByStore}
              />
            </>
          ) : (
            <Card className="py-12 text-center text-muted">
              Aucun magasin à suivre
            </Card>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-6">
          <Suspense fallback={null}>
            <StoreFilterBar stores={stores} selectedStoreId={selectedStoreId} />
          </Suspense>

          <Card padding={false}>
            <div className="p-6">
              <CardHeader
                title="Statistiques du magasin"
                description={selectedStoreLabel || "Sélectionnez un magasin"}
              />
            </div>

            {stats && selectedStoreId ? (
              <div className="grid gap-4 p-6 pt-0 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Ventes aujourd'hui"
                  value={String(stats.todaySales)}
                  subtitle={formatCurrency(stats.todayRevenue)}
                  icon={TrendingUp}
                />
                <StatCard
                  title="Chiffre d'affaires total"
                  value={formatCurrency(stats.totalRevenue)}
                  subtitle={`${stats.totalSales} ventes`}
                  icon={ShoppingBag}
                  accent="bg-primary"
                />
                <StatCard
                  title="Produits en catalogue"
                  value={String(stats.totalProducts)}
                  icon={Package}
                />
                <StatCard
                  title="Stock faible"
                  value={String(stats.lowStockCount)}
                  subtitle="Produits < 10 unités"
                  icon={AlertTriangle}
                  accent={stats.lowStockCount > 0 ? "bg-primary/30" : undefined}
                />
              </div>
            ) : (
              <p className="px-6 pb-12 text-center text-muted">
                Sélectionnez un magasin pour voir les statistiques
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export function ManagerDashboardTabs(props: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeOverview: StoreOverviewRow[];
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardTabsInner {...props} />
    </Suspense>
  );
}
