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
import { RecentActivityPanel } from "@/components/activity/recent-activity-panel";
import { cn } from "@/lib/utils";
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
  const stockOnly = !isDirector;
  const stockBasePath = isDirector ? "/director" : "/manager";
  const stockHref = (storeId: string) => `${stockBasePath}/stock?store=${storeId}`;
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

  const allStoresScopeLabel =
    stores.length === 1
      ? `${stores[0].name} — ${stores[0].city}`
      : isDirector
        ? `Tous les magasins (${stores.length})`
        : `Magasins ${stores[0]?.city ?? ""} (${stores.length})`;

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
              allStores={stores}
              allStoresScopeLabel={allStoresScopeLabel}
              stockOnly={stockOnly}
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
            {isDirector ? (
              <>
                <div className="md:hidden">{storeFilterMobile}</div>
                <div className="hidden md:block">{storeFilterDesktop}</div>
              </>
            ) : (
              storeFilterMobile
            )}
          </Suspense>

          <DashboardStoreStatsPanel
            stores={stores}
            selectedStoreId={selectedStoreId}
            selectedStoreLabel={selectedStoreLabel}
            stats={stats}
            allStoresScopeLabel={allStoresScopeLabel}
            hideDescription={isDirector}
            stockOnly={stockOnly}
            overviewByStore={overviewByStore}
            stockHref={stockHref}
          />

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
