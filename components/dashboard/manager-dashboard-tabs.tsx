"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BarChart3,
  Store as StoreIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { StoreTrackingView } from "@/components/dashboard/store-tracking-view";
import { DashboardStoreStatsPanel } from "@/components/dashboard/dashboard-store-stats-panel";
import { ManagerUnifiedDashboard } from "@/components/dashboard/manager-unified-dashboard";
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { cn } from "@/lib/utils";
import type {
  ActivityEntry,
  DashboardStats,
  Store,
  StoreOutOfStockProduct,
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
  { id: "stats", label: "Statistiques stock", icon: BarChart3 },
];

function ManagerDashboardTabsInner({
  stores,
  selectedStoreId,
  selectedStoreLabel,
  stats,
  storeSnapshots,
  overviewByStore,
  storeActivities,
  outOfStockProducts,
  storesWithStats = [],
}: {
  stores: Store[];
  selectedStoreId: string;
  selectedStoreLabel: string;
  stats: DashboardStats | null;
  storeSnapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  storeActivities: ActivityEntry[];
  outOfStockProducts: StoreOutOfStockProduct[];
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDirector = pathname.startsWith("/director");

  if (!isDirector) {
    return (
      <ManagerUnifiedDashboard
        stores={stores}
        selectedStoreId={selectedStoreId}
        selectedStoreLabel={selectedStoreLabel}
        storeSnapshots={storeSnapshots}
        overviewByStore={overviewByStore}
        storeActivities={storeActivities}
        outOfStockProducts={outOfStockProducts}
        storesWithStats={storesWithStats}
      />
    );
  }

  const activityBase = "/director";
  const stockHref = (storeId: string) => `/director/stock?store=${storeId}`;
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
    hideSelectedOnMobile: true,
  };

  const allStoresScopeLabel =
    stores.length === 1
      ? `${stores[0].name} — ${stores[0].city}`
      : `Tous les magasins (${stores.length})`;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="natus-mobile-tab-bar inline-flex w-full rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm sm:w-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer sm:flex-initial sm:gap-2 sm:px-6",
              activeTab === id
                ? "bg-champagne text-black shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="md:hidden">{id === "suivi" ? "Suivi" : "Stock"}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "suivi" && (
        <div className="space-y-6">
          <Suspense fallback={null}>
            <div className="md:hidden">
              <StoreFilterBar {...storeFilterProps} layout="compact" className="p-3" />
            </div>
            <div className="hidden md:block">
              <StoreFilterBar {...storeFilterProps} />
            </div>
          </Suspense>

          {selectedStoreId ? (
            <StoreTrackingView
              storeSnapshots={storeSnapshots}
              overviewByStore={overviewByStore}
              selectedStoreId={selectedStoreId}
              selectedStoreLabel={selectedStoreLabel}
              hideStoreHeader
              allStores={stores}
              allStoresScopeLabel={allStoresScopeLabel}
              stockOnly={false}
              stockHref={stockHref}
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
            <div className="md:hidden">
              <StoreFilterBar {...storeFilterProps} layout="compact" className="p-3" />
            </div>
            <div className="hidden md:block">
              <StoreFilterBar {...storeFilterProps} />
            </div>
          </Suspense>

          <DashboardStoreStatsPanel
            stores={stores}
            selectedStoreId={selectedStoreId}
            selectedStoreLabel={selectedStoreLabel}
            stats={stats}
            allStoresScopeLabel={allStoresScopeLabel}
            hideDescription
            stockOnly={false}
            overviewByStore={overviewByStore}
            stockHref={stockHref}
          />

          {selectedStoreId && (
            <RecentActivityPanel
              activities={storeActivities}
              title="Activité du magasin"
              description={selectedStoreLabel}
              descriptionClassName="hidden md:block"
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
  outOfStockProducts: StoreOutOfStockProduct[];
  storesWithStats?: Array<{ id: string; productCount?: number }>;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardTabsInner {...props} />
    </Suspense>
  );
}
