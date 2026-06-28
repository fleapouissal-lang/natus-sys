import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { DirectorHistoryTabs } from "@/components/director/director-history-tabs";
import { listStoreDayClosures } from "@/lib/sales/store-day-closure-actions";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import { resolveEffectivePageKeys } from "@/lib/user-page-access";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import type { Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

function directorCanAccessTab(
  keys: ReturnType<typeof resolveEffectivePageKeys>,
  tab: "activity" | "sales" | "pos_closures"
): boolean {
  if (!keys) return true;
  return keys.includes(tab);
}

export default async function DirectorHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const pageKeys = resolveEffectivePageKeys(profile);
  const showActivityTab = directorCanAccessTab(pageKeys, "activity");
  const showSalesTab = directorCanAccessTab(pageKeys, "sales");
  const showClosuresTab = directorCanAccessTab(pageKeys, "pos_closures");

  if (!showActivityTab && !showSalesTab && !showClosuresTab) {
    redirect("/director");
  }

  const stores = await getActiveStores(null);
  const storeIds = stores.map((store) => store.id);
  const scopeLabel = "Tous les magasins";
  const showStoreColumn = true;

  const [activities, salesResult, closuresResult, closureSettings] = await Promise.all([
    showActivityTab && storeIds.length > 0
      ? getActivityLog(storeIds, 200)
      : Promise.resolve([]),
    (async () => {
      if (!showSalesTab || storeIds.length === 0) return [] as Sale[];
      const supabase = await createClient();
      const { data } = await supabase
        .from("sales")
        .select(SALE_HISTORY_SELECT)
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as Sale[];
    })(),
    showClosuresTab
      ? listStoreDayClosures()
      : Promise.resolve({ closures: [] as StoreDayClosureReportRow[] }),
    showClosuresTab ? getPosClosureSettings() : Promise.resolve({ requireManagerCode: true }),
  ]);

  const closures = "closures" in closuresResult ? closuresResult.closures : [];

  const closureSettingsHint = closureSettings.requireManagerCode
    ? "Rapports de clôture validés — validez les clôtures en attente depuis Clôtures caisse."
    : "Clôture directe activée — historique des rapports de clôture par magasin.";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-muted">
          Journal du directeur, ventes et clôtures — tous les magasins
        </p>
      </div>

      <DirectorHistoryTabs
        activities={activities}
        activityScopeLabel={scopeLabel}
        showStoreColumn={showStoreColumn}
        sales={salesResult}
        stores={stores}
        salesScopeLabel={scopeLabel}
        closures={closures}
        showActivityTab={showActivityTab}
        showSalesTab={showSalesTab}
        showClosuresTab={showClosuresTab}
        closureSettingsHint={closureSettingsHint}
      />
    </div>
  );
}
