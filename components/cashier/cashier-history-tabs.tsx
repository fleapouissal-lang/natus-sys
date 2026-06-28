"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Receipt, ScrollText } from "lucide-react";
import { CashierSalesHistory } from "@/components/sales/cashier-sales-history";
import {
  StoreDayClosureReportsList,
  filterStoreDayClosures,
} from "@/components/sales/store-day-closure-reports-list";
import { ClosureHistoryFilterBar } from "@/components/sales/closure-history-filter-bar";
import { cn } from "@/lib/utils";
import {
  clampDateToCashierSalesWindow,
  type getCashierSalesHistoryDateBounds,
} from "@/lib/sales/manager-sales-window";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import type { Sale } from "@/lib/types";

const PARAM_CLOSURE_FROM = "cfrom";
const PARAM_CLOSURE_TO = "cto";
const PARAM_CLOSURE_SEARCH = "cq";
const PARAM_CLOSURE_PAGE = "cpage";

type HistoryTab = "sales" | "closures";

const TABS: {
  id: HistoryTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
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

function CashierHistoryTabsInner({
  initialSales,
  initialClosures,
  salesMode,
  storeId,
  cashierId,
  cashierName,
  historyBounds,
  showSalesTab,
  showClosuresTab,
  salesError,
}: {
  initialSales: Sale[];
  initialClosures: StoreDayClosureReportRow[];
  salesMode: "personal" | "store";
  storeId?: string;
  cashierId?: string;
  cashierName?: string;
  historyBounds: ReturnType<typeof getCashierSalesHistoryDateBounds>;
  showSalesTab: boolean;
  showClosuresTab: boolean;
  salesError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleTabs = TABS.filter(
    (tab) => (tab.id === "sales" && showSalesTab) || (tab.id === "closures" && showClosuresTab)
  );

  const tabParam = searchParams.get("tab");
  const requestedTab: HistoryTab | null =
    tabParam === "closures" || tabParam === "sales" ? tabParam : null;
  const defaultTab: HistoryTab = showSalesTab ? "sales" : "closures";
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

  const closureDefaultFrom = historyBounds.maxDate;
  const closureDefaultTo = historyBounds.maxDate;
  const closureFrom = searchParams.get(PARAM_CLOSURE_FROM) || closureDefaultFrom;
  const closureTo = searchParams.get(PARAM_CLOSURE_TO) || closureDefaultTo;
  const closureSearch = searchParams.get(PARAM_CLOSURE_SEARCH) || "";
  const closurePage = Math.max(1, Number(searchParams.get(PARAM_CLOSURE_PAGE)) || 1);
  const closureHasFilters =
    closureFrom !== closureDefaultFrom ||
    closureTo !== closureDefaultTo ||
    Boolean(closureSearch);

  const updateClosureParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete(PARAM_CLOSURE_PAGE);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  function handleClosureFromChange(value: string) {
    const clamped = clampDateToCashierSalesWindow(value, historyBounds);
    updateClosureParams({
      [PARAM_CLOSURE_FROM]: clamped === closureDefaultFrom ? null : clamped,
    });
  }

  function handleClosureToChange(value: string) {
    const clamped = clampDateToCashierSalesWindow(value, historyBounds);
    updateClosureParams({
      [PARAM_CLOSURE_TO]: clamped === closureDefaultTo ? null : clamped,
    });
  }

  function handleClosureSearchChange(value: string) {
    updateClosureParams({ [PARAM_CLOSURE_SEARCH]: value || null });
  }

  function resetClosureFilters() {
    updateClosureParams({
      [PARAM_CLOSURE_FROM]: null,
      [PARAM_CLOSURE_TO]: null,
      [PARAM_CLOSURE_SEARCH]: null,
    });
  }

  function setClosurePage(next: number) {
    updateClosureParams({ [PARAM_CLOSURE_PAGE]: next <= 1 ? null : String(next) }, false);
  }

  return (
    <div className="space-y-6">
      {visibleTabs.length > 1 && (
        <div className="natus-mobile-tab-bar inline-flex w-full rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm sm:w-auto">
          {visibleTabs.map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer sm:flex-initial sm:gap-2 sm:px-5",
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

      {activeTab === "sales" && showSalesTab && (
        <>
          {salesError && (
            <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
              Impossible de charger les ventes : {salesError}
            </p>
          )}
          <CashierSalesHistory
            initialSales={initialSales}
            mode={salesMode}
            storeId={storeId}
            cashierId={cashierId}
            cashierName={cashierName}
            historyBounds={historyBounds}
          />
        </>
      )}

      {activeTab === "closures" && showClosuresTab && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-sm text-muted">
              Rapports validés par le gérant — aujourd&apos;hui et les 3 jours précédents. Pour
              clôturer le jour en cours, utilisez le bouton &laquo;&nbsp;Clôture du jour&nbsp;&raquo;
              en caisse.
            </p>
            <Link
              href="/cashier/pos?closure=1"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-champagne px-4 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              Clôture du jour
            </Link>
          </div>
          <ClosureHistoryFilterBar
            dateFrom={closureFrom}
            dateTo={closureTo}
            search={closureSearch}
            onDateFromChange={handleClosureFromChange}
            onDateToChange={handleClosureToChange}
            onSearchChange={handleClosureSearchChange}
            onReset={resetClosureFilters}
            resultCount={
              filterStoreDayClosures(initialClosures, {
                dateFrom: closureFrom,
                dateTo: closureTo,
                searchQuery: closureSearch,
              }).length
            }
            hasActiveFilters={closureHasFilters}
            dateMin={historyBounds.minDate}
            dateMax={historyBounds.maxDate}
          />
          <StoreDayClosureReportsList
            initialClosures={initialClosures}
            storeId={storeId}
            isCashier
            showStoreColumn={false}
            historyBounds={historyBounds}
            dateFrom={closureFrom}
            dateTo={closureTo}
            searchQuery={closureSearch}
            page={closurePage}
            onPageChange={setClosurePage}
          />
        </div>
      )}
    </div>
  );
}

export function CashierHistoryTabs(props: {
  initialSales: Sale[];
  initialClosures: StoreDayClosureReportRow[];
  salesMode: "personal" | "store";
  storeId?: string;
  cashierId?: string;
  cashierName?: string;
  historyBounds: ReturnType<typeof getCashierSalesHistoryDateBounds>;
  showSalesTab: boolean;
  showClosuresTab: boolean;
  salesError: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <CashierHistoryTabsInner {...props} />
    </Suspense>
  );
}
