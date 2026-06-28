import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  fetchCashierSales,
  fetchStoreSales,
} from "@/lib/sales/fetch-cashier-sales";
import { CashierHistoryTabs } from "@/components/cashier/cashier-history-tabs";
import {
  filterByCashierHistoryDateBounds,
  getCashierSalesHistoryDateBounds,
} from "@/lib/sales/manager-sales-window";
import { listStoreDayClosures } from "@/lib/sales/store-day-closure-actions";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import { resolveEffectivePageKeys } from "@/lib/user-page-access";

export const dynamic = "force-dynamic";

function cashierCanAccessTab(
  keys: ReturnType<typeof resolveEffectivePageKeys>,
  tab: "sales" | "pos_closures"
): boolean {
  if (!keys) return true;
  return keys.includes(tab);
}

export default async function CashierHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");

  const pageKeys = resolveEffectivePageKeys(profile);
  const showSalesTab = cashierCanAccessTab(pageKeys, "sales");
  const showClosuresTab =
    Boolean(profile.store_id) && cashierCanAccessTab(pageKeys, "pos_closures");

  if (!showSalesTab && !showClosuresTab) {
    redirect("/cashier/pos");
  }

  const supabase = await createClient();
  const isStorePos = profile.is_store_pos === true;
  const historyBounds = getCashierSalesHistoryDateBounds();

  let sales: Awaited<ReturnType<typeof fetchCashierSales>>["sales"] = [];
  let salesError: string | null = null;

  if (showSalesTab) {
    if (isStorePos && profile.store_id) {
      const result = await fetchStoreSales(supabase, profile.store_id, historyBounds);
      sales = result.sales;
      salesError = result.error;
    } else {
      const result = await fetchCashierSales(supabase, profile.id, historyBounds);
      sales = result.sales;
      salesError = result.error;
    }
  }

  let closures: StoreDayClosureReportRow[] = [];

  if (showClosuresTab && profile.store_id) {
    const result = await listStoreDayClosures(profile.store_id);
    if ("closures" in result) {
      closures = filterByCashierHistoryDateBounds(result.closures, historyBounds);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-muted">
          {showSalesTab && showClosuresTab
            ? "Ventes et clôtures du magasin — aujourd'hui et les 3 jours précédents"
            : showSalesTab
              ? isStorePos
                ? "Ventes du magasin — aujourd'hui et les 3 jours précédents"
                : "Vos ventes en caisse — aujourd'hui et les 3 jours précédents"
              : "Clôtures du magasin — aujourd'hui et les 3 jours précédents"}
        </p>
      </div>

      <CashierHistoryTabs
        initialSales={sales}
        initialClosures={closures}
        salesMode={isStorePos ? "store" : "personal"}
        storeId={profile.store_id ?? undefined}
        cashierId={isStorePos ? undefined : profile.id}
        cashierName={profile.full_name || profile.email || undefined}
        historyBounds={historyBounds}
        showSalesTab={showSalesTab}
        showClosuresTab={showClosuresTab}
        salesError={salesError}
      />
    </div>
  );
}
