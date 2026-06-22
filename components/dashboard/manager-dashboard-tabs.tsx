"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  BarChart3,
  Package,
  ShoppingBag,
  Store as StoreIcon,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { StoreTrackingView } from "@/components/dashboard/store-tracking-view";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { formatCurrency, cn } from "@/lib/utils";
import type {
  ActivityEntry,
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
  { id: "suivi", label: "Suivi des magasins", icon: StoreIcon },
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

function ManagerDashboardTabsInner({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  storeSnapshots,
  overviewByStore,
  storeActivities,
}: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDirector = pathname.startsWith("/director");
  const activityBase = isDirector ? "/director" : "/manager";
  const tabParam = searchParams.get("tab");
  const activeTab: DashboardTab =
    tabParam === "stats" || tabParam === "suivi" ? tabParam : "suivi";

  function setTab(tab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  const storeFilterProps = {
    stores,
    selectedStoreId,
    hideSelectedOnMobile: isDirector,
  };

  const storeFilterMobile = isDirector ? (
    <StoreFilterBar {...storeFilterProps} layout="compact" className="p-3" />
  ) : (
    <StoreFilterBar {...storeFilterProps} />
  );

  const storeFilterDesktop = isDirector ? (
    <StoreFilterBar {...storeFilterProps} />
  ) : null;

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
          <Suspense fallback={null}>
            {isDirector ? (
              <>
                <div className="md:hidden">{storeFilterMobile}</div>
                <div className="hidden md:block">{storeFilterDesktop}</div>
              </>
            ) : (
              storeFilterMobile
            )}
          </Suspense>

          {selectedStoreId ? (
            <StoreTrackingView
              storeSnapshots={storeSnapshots}
              overviewByStore={overviewByStore}
              selectedStoreId={selectedStoreId}
              selectedStoreLabel={selectedStoreLabel}
              hideStoreHeader={isDirector}
            />
          ) : (
            <Card className="py-12 text-center text-muted">
              Sélectionnez un magasin pour voir le suivi
            </Card>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-6">
          <Suspense fallback={null}>
            {isDirector ? (
              <>
                <div className="md:hidden">{storeFilterMobile}</div>
                <div className="hidden md:block">{storeFilterDesktop}</div>
              </>
            ) : (
              storeFilterMobile
            )}
          </Suspense>

          <Card padding={false}>
            <div className="p-6">
              <CardHeader
                title="Statistiques du magasin"
                description={selectedStoreLabel || "Sélectionnez un magasin"}
                descriptionClassName={isDirector ? "hidden md:block" : undefined}
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

          {selectedStoreId && (
            <RecentActivityPanel
              activities={storeActivities}
              title="Activité du magasin"
              description={selectedStoreLabel}
              descriptionClassName={isDirector ? "hidden md:block" : undefined}
              viewAllHref={`${activityBase}/activity?store=${selectedStoreId}`}
              limit={8}
            />
          )}
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
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
}) {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardTabsInner {...props} />
    </Suspense>
  );
}
