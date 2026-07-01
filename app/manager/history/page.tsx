import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, isManager } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getActivityLog } from "@/lib/activity";
import { getProfileLockedStoreId } from "@/lib/management-store";
import { ManagerHistoryTabs } from "@/components/manager/manager-history-tabs";
import { getManagerSalesHistoryDateBounds } from "@/lib/sales/manager-sales-window";
import { listStoreDayClosures } from "@/lib/sales/store-day-closure-actions";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import { resolveEffectivePageKeys } from "@/lib/user-page-access";
import { getManagerOutgoingHubTransfers } from "@/lib/hub-transfers";
import { getSourceOrderHistoryStoreTransfers } from "@/lib/store-transfers";
import { SOURCE_ORDER_HISTORY_LIMIT } from "@/lib/stock-transfers/source-order-history";
import { buildManagerSourceHistoryGroups } from "@/lib/stock-transfers/build-source-history-groups";
import {
  getAllActiveTransferSites,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { getProductCatalog } from "@/lib/inventory";
import type { Sale, Store } from "@/lib/types";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";

function collectTransferLivreurCities(sourceStores: Store[], hubStores: Store[]) {
  return [
    ...new Set(
      [...sourceStores, ...hubStores].map((store) => store.city).filter(Boolean)
    ),
  ] as string[];
}

export const dynamic = "force-dynamic";

function managerCanAccessTab(
  keys: ReturnType<typeof resolveEffectivePageKeys>,
  tab: "activity" | "sales" | "pos_closures"
): boolean {
  if (!keys) return true;
  return keys.includes(tab);
}

function managerScopeLabel(storeCount: number, singleStoreLabel?: string): string {
  if (storeCount === 1 && singleStoreLabel) return singleStoreLabel;
  if (storeCount > 1) return `Tous vos magasins (${storeCount})`;
  return "Aucun magasin assigné";
}

export default async function ManagerHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isManager(profile)) redirect("/login");

  const pageKeys = resolveEffectivePageKeys(profile);
  const showActivityTab = managerCanAccessTab(pageKeys, "activity");
  const showSalesTab = managerCanAccessTab(pageKeys, "sales");
  const showClosuresTab = managerCanAccessTab(pageKeys, "pos_closures");

  if (!showActivityTab && !showSalesTab && !showClosuresTab) {
    redirect("/manager");
  }

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const lockedStoreId = getProfileLockedStoreId(profile);
  const stores = lockedStoreId
    ? storesAll.filter((store) => store.id === lockedStoreId)
    : storesAll;
  const storeIds = stores.map((store) => store.id);
  const singleStoreLabel =
    stores.length === 1 ? `${stores[0].name} — ${stores[0].city}` : undefined;
  const scopeLabel = managerScopeLabel(stores.length, singleStoreLabel);
  const showStoreColumn = stores.length > 1;
  const historyBounds = getManagerSalesHistoryDateBounds();

  const [activities, salesResult, closuresResult, closureSettings, transferData] =
    await Promise.all([
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
        .gte("created_at", `${historyBounds.minDate}T00:00:00`)
        .lte("created_at", `${historyBounds.maxDate}T23:59:59.999`)
        .order("created_at", { ascending: false });
      return (data || []) as Sale[];
    })(),
    showClosuresTab ? listStoreDayClosures() : Promise.resolve({ closures: [] as StoreDayClosureReportRow[] }),
    showClosuresTab ? getPosClosureSettings() : Promise.resolve({ requireManagerCode: true }),
    (async () => {
      if (!showActivityTab || storeIds.length === 0) return null;
      const sitesAll = await getAllActiveTransferSites();
      const destinationSites = sitesAll.filter((site) => site.is_active);
      const hubStores = sitesAll.filter((site) => site.is_active && site.is_hub);
      const filter = resolveSentTransfersListScope(profile, stores, {}, {
        restrictSourceToScopedStores: true,
      });
      const [storeTransfers, hubOutgoingTransfers, livreurs, catalogProducts] =
        await Promise.all([
          getSourceOrderHistoryStoreTransfers(storeIds),
          getManagerOutgoingHubTransfers(storeIds, SOURCE_ORDER_HISTORY_LIMIT),
          getTransferLivreurs(collectTransferLivreurCities(stores, hubStores)),
          getProductCatalog(),
        ]);
      return {
        filter,
        groups: buildManagerSourceHistoryGroups(
          storeTransfers,
          hubOutgoingTransfers,
          storeIds
        ),
        locationConfig: {
          sourceSites: stores,
          destinationSites,
          strictSourceOptions: true,
          strictDestinationOptions: true,
        },
        productLookup: buildReceivedTransferProductLookup(catalogProducts),
        managedStoreIds: storeIds,
        livreurs,
      };
    })(),
  ]);

  const closures =
    "closures" in closuresResult
      ? storeIds.length > 0
        ? closuresResult.closures.filter((closure) => storeIds.includes(closure.store_id))
        : closuresResult.closures
      : [];

  const closureSettingsHint = closureSettings.requireManagerCode
    ? "Rapports de clôture validés — consultez l'historique ou validez une clôture en attente depuis Clôtures caisse."
    : "Clôture directe activée — historique des rapports de clôture par magasin.";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-muted">
          Historique des commandes envoyées, ventes et clôtures — {scopeLabel.toLowerCase()}
        </p>
      </div>

      {stores.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucun magasin associé à ce compte.</p>
      ) : (
        <ManagerHistoryTabs
          activities={activities}
          activityScopeLabel={scopeLabel}
          showStoreColumn={showStoreColumn}
          sales={salesResult}
          stores={stores}
          salesScopeLabel={scopeLabel}
          historyBounds={historyBounds}
          closures={closures}
          showActivityTab={showActivityTab}
          showSalesTab={showSalesTab}
          showClosuresTab={showClosuresTab}
          closureSettingsHint={closureSettingsHint}
          transferFilter={transferData?.filter}
          transferGroups={transferData?.groups}
          transferLocationConfig={transferData?.locationConfig}
          transferProductLookup={transferData?.productLookup}
          transferManagedStoreIds={transferData?.managedStoreIds}
          transferLivreurs={transferData?.livreurs}
          transferScopeLabel={scopeLabel}
        />
      )}
    </div>
  );
}
