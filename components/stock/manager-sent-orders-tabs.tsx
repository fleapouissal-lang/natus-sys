"use client";

import { Suspense, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import { SourceOrderHistoryView } from "@/components/stock/source-order-history-view";
import { cn } from "@/lib/utils";
import {
  resolveSentOrdersTab,
  SENT_ORDERS_TAB_CONFIG,
  type SentOrdersTabId,
} from "@/lib/stock-transfers/sent-orders-tabs";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import {
  filterOutgoingHubTransfersFromStores,
  filterOutgoingStoreTransfersFromStores,
} from "@/lib/stock-transfers/role-transfer-filters";
import type { HubStockTransfer, Product, Profile, Store, StoreStockTransfer } from "@/lib/types";

type SentTab = SentOrdersTabId;

const TABS = SENT_ORDERS_TAB_CONFIG;

function ManagerSentOrdersTabsInner({
  sourceStores,
  destinationStores,
  products,
  fromStoreId,
  toStoreId,
  lockFromStore,
  hubStores,
  toHubStoreId,
  initialDestination,
  storeTransfers,
  hubOutgoingTransfers,
  managedStoreIds,
  sourceSites,
  destinationSites,
  livreurs,
  filter,
  productLookup,
  historyGroups,
}: {
  sourceStores: Store[];
  destinationStores: Store[];
  products: Product[];
  fromStoreId: string;
  toStoreId: string;
  lockFromStore: boolean;
  hubStores: Store[];
  toHubStoreId: string;
  initialDestination: "store" | "hub";
  storeTransfers: StoreStockTransfer[];
  hubOutgoingTransfers: HubStockTransfer[];
  managedStoreIds: string[];
  sourceSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  historyGroups?: {
    kind: "store" | "depot";
    typeLabel: string;
    storeTransfers?: StoreStockTransfer[];
    hubTransfers?: HubStockTransfer[];
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = resolveSentOrdersTab(tabParam, ["store", "depot"]);

  const groups = useMemo(
    () => [
      {
        kind: "store" as const,
        typeLabel: "Vers magasin",
        storeTransfers: filterOutgoingStoreTransfersFromStores(
          storeTransfers,
          managedStoreIds
        ),
      },
      {
        kind: "depot" as const,
        typeLabel: "Vers dépôt",
        hubTransfers: filterOutgoingHubTransfersFromStores(
          hubOutgoingTransfers,
          managedStoreIds
        ),
      },
    ],
    [storeTransfers, hubOutgoingTransfers, managedStoreIds]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites,
      destinationSites,
      strictSourceOptions: true,
    }),
    [sourceSites, destinationSites]
  );

  function setTab(tab: SentTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="natus-mobile-tab-bar inline-flex w-full rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm sm:w-auto">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
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

      {activeTab === "new" && (
        <StoreStockTransferManager
          sourceStores={sourceStores}
          stores={destinationStores}
          products={products}
          fromStoreId={fromStoreId}
          toStoreId={toStoreId}
          lockFromStore={lockFromStore}
          basePath="/manager"
          hubStores={hubStores}
          toHubStoreId={toHubStoreId}
          enableHubDestination
          initialDestination={initialDestination}
          showAllDestinations
        />
      )}

      {activeTab === "sent" && (
        <SentTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={locationConfig}
          productLookup={productLookup}
          managedStoreIds={managedStoreIds}
          livreurs={livreurs}
          workflowSplit="sent-no-pending"
          storeActionMode="none"
          hubReadOnly
          emptyMessage="Aucun transfert envoyé (hors statut En cours)"
        />
      )}

      {activeTab === "history" && (
        <SourceOrderHistoryView
          filter={filter}
          groups={historyGroups ?? groups}
          locationConfig={locationConfig}
          productLookup={productLookup}
          managedStoreIds={managedStoreIds}
          livreurs={livreurs}
        />
      )}
    </div>
  );
}

export function ManagerSentOrdersTabs(props: {
  sourceStores: Store[];
  destinationStores: Store[];
  products: Product[];
  fromStoreId: string;
  toStoreId: string;
  lockFromStore: boolean;
  hubStores: Store[];
  toHubStoreId: string;
  initialDestination: "store" | "hub";
  storeTransfers: StoreStockTransfer[];
  hubOutgoingTransfers: HubStockTransfer[];
  managedStoreIds: string[];
  sourceSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  historyGroups?: {
    kind: "store" | "depot";
    typeLabel: string;
    storeTransfers?: StoreStockTransfer[];
    hubTransfers?: HubStockTransfer[];
  }[];
}) {
  return (
    <Suspense fallback={null}>
      <ManagerSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
