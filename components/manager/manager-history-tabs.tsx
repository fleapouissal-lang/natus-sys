"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ClipboardList, Receipt, ScrollText } from "lucide-react";
import { ManagerActivityPanel } from "@/components/manager/manager-activity-panel";
import { ManagerSalesHistory } from "@/components/sales/manager-sales-history";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";
import { cn } from "@/lib/utils";
import type { getManagerSalesHistoryDateBounds } from "@/lib/sales/manager-sales-window";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import { ManagerSourceTransferHistory } from "@/components/stock/source-order-history-view";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type {
  ReceivedTransferProductLookup,
  ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { ActivityEntry, Profile, Sale, Store } from "@/lib/types";

type HistoryTab = "activity" | "sales" | "closures";

const TABS: {
  id: HistoryTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "activity",
    label: "Historique des commandes",
    shortLabel: "Commandes",
    icon: ClipboardList,
  },
  {
    id: "sales",
    label: "Historique des ventes",
    shortLabel: "Ventes",
    icon: Receipt,
  },
  {
    id: "closures",
    label: "Historique des clôtures",
    shortLabel: "Clôtures",
    icon: ScrollText,
  },
];

function ManagerHistoryTabsInner({
  activities,
  activityScopeLabel,
  showStoreColumn,
  sales,
  stores,
  salesScopeLabel,
  historyBounds,
  closures,
  showActivityTab,
  showSalesTab,
  showClosuresTab,
  closureSettingsHint,
  transferFilter,
  transferGroups,
  transferLocationConfig,
  transferProductLookup,
  transferManagedStoreIds,
  transferLivreurs,
  transferScopeLabel,
}: {
  activities: ActivityEntry[];
  activityScopeLabel: string;
  showStoreColumn: boolean;
  sales: Sale[];
  stores: Store[];
  salesScopeLabel: string;
  historyBounds: ReturnType<typeof getManagerSalesHistoryDateBounds>;
  closures: StoreDayClosureReportRow[];
  showActivityTab: boolean;
  showSalesTab: boolean;
  showClosuresTab: boolean;
  closureSettingsHint: string;
  transferFilter?: ReceivedTransfersFilterScope;
  transferGroups?: ReceivedTransferRowGroup[];
  transferLocationConfig?: {
    sourceSites: ReceivedTransferLocationSites[];
    destinationSites: ReceivedTransferLocationSites[];
    strictSourceOptions?: boolean;
    strictDestinationOptions?: boolean;
  };
  transferProductLookup?: ReceivedTransferProductLookup;
  transferManagedStoreIds?: string[];
  transferLivreurs?: Profile[];
  transferScopeLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleTabs = TABS.filter(
    (tab) =>
      (tab.id === "activity" && showActivityTab) ||
      (tab.id === "sales" && showSalesTab) ||
      (tab.id === "closures" && showClosuresTab)
  );

  const tabParam = searchParams.get("tab");
  const requestedTab: HistoryTab | null =
    tabParam === "activity" || tabParam === "sales" || tabParam === "closures"
      ? tabParam
      : null;
  const defaultTab: HistoryTab = showActivityTab ? "activity" : showSalesTab ? "sales" : "closures";
  const activeTab: HistoryTab =
    requestedTab && visibleTabs.some((tab) => tab.id === requestedTab)
      ? requestedTab
      : defaultTab;

  function setTab(tab: HistoryTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-6">
      {visibleTabs.length > 1 && (
        <div className="natus-mobile-tab-bar inline-flex w-full flex-wrap rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm sm:w-auto">
          {visibleTabs.map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer sm:flex-initial sm:gap-2 sm:px-4",
                activeTab === id
                  ? "bg-champagne text-black shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === "activity" && showActivityTab && (
        transferFilter &&
        transferGroups &&
        transferLocationConfig &&
        transferManagedStoreIds ? (
          <ManagerSourceTransferHistory
            filter={transferFilter}
            groups={transferGroups}
            locationConfig={transferLocationConfig}
            productLookup={transferProductLookup}
            managedStoreIds={transferManagedStoreIds}
            livreurs={transferLivreurs}
            scopeLabel={transferScopeLabel || activityScopeLabel}
          />
        ) : (
          <ManagerActivityPanel
            activities={activities}
            scopeLabel={activityScopeLabel}
            showStoreColumn={showStoreColumn}
          />
        )
      )}

      {activeTab === "sales" && showSalesTab && (
        <ManagerSalesHistory
          sales={sales}
          storeLabel={salesScopeLabel}
          stores={stores}
          selectedStoreId=""
          historyBounds={historyBounds}
          localStoreFilter
          storeAllowAll
          showStoreColumn={showStoreColumn}
        />
      )}

      {activeTab === "closures" && showClosuresTab && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-sm text-muted">{closureSettingsHint}</p>
            <Link
              href="/manager/pos-closures"
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-primary/25 bg-surface px-4 py-2 text-sm font-medium hover:bg-primary-light/30"
            >
              Valider une clôture
            </Link>
          </div>
          <StoreDayClosureReportsList initialClosures={closures} showStoreColumn={showStoreColumn} />
        </div>
      )}
    </div>
  );
}

export function ManagerHistoryTabs(props: {
  activities: ActivityEntry[];
  activityScopeLabel: string;
  showStoreColumn: boolean;
  sales: Sale[];
  stores: Store[];
  salesScopeLabel: string;
  historyBounds: ReturnType<typeof getManagerSalesHistoryDateBounds>;
  closures: StoreDayClosureReportRow[];
  showActivityTab: boolean;
  showSalesTab: boolean;
  showClosuresTab: boolean;
  closureSettingsHint: string;
  transferFilter?: ReceivedTransfersFilterScope;
  transferGroups?: ReceivedTransferRowGroup[];
  transferLocationConfig?: {
    sourceSites: ReceivedTransferLocationSites[];
    destinationSites: ReceivedTransferLocationSites[];
    strictSourceOptions?: boolean;
    strictDestinationOptions?: boolean;
  };
  transferProductLookup?: ReceivedTransferProductLookup;
  transferManagedStoreIds?: string[];
  transferLivreurs?: Profile[];
  transferScopeLabel?: string;
}) {
  return (
    <Suspense fallback={null}>
      <ManagerHistoryTabsInner {...props} />
    </Suspense>
  );
}
