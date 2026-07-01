"use client";

import { Suspense, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DirectorStockTransferManager } from "@/components/stock/director-stock-transfer-manager";
import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import { cn } from "@/lib/utils";
import {
  resolveSentOrdersTab,
  SENT_ORDERS_TAB_CONFIG,
  type SentOrdersTabId,
} from "@/lib/stock-transfers/sent-orders-tabs";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { HubStockTransfer, Product, Profile, Store as StoreType, StoreStockTransfer } from "@/lib/types";

type SentTab = SentOrdersTabId;

const TABS = SENT_ORDERS_TAB_CONFIG;

function DirectorSentOrdersTabsInner({
  retailStores,
  hubStores,
  products,
  sourceType,
  destType,
  fromStoreId,
  fromHubStoreId,
  toStoreId,
  toHubStoreId,
  interStoreTransfers,
  hubHubTransfers,
  hubStoreMixedTransfers,
  retailStoreIds,
  transferSites,
  livreurs,
  filter,
  productLookup,
  successMessage,
}: {
  retailStores: StoreType[];
  hubStores: StoreType[];
  products: Product[];
  sourceType: "store" | "hub";
  destType: "store" | "hub";
  fromStoreId: string;
  fromHubStoreId: string;
  toStoreId: string;
  toHubStoreId: string;
  interStoreTransfers: StoreStockTransfer[];
  hubHubTransfers: HubStockTransfer[];
  hubStoreMixedTransfers: HubStockTransfer[];
  retailStoreIds: string[];
  transferSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  successMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = resolveSentOrdersTab(tabParam, ["store", "hub", "mixed"]);

  const groups = useMemo(
    () => [
      {
        kind: "store" as const,
        typeLabel: "Inter-magasins",
        storeTransfers: interStoreTransfers,
      },
      {
        kind: "hub" as const,
        typeLabel: "Entre Hubs",
        hubTransfers: hubHubTransfers,
      },
      {
        kind: "mixed" as const,
        typeLabel: "Hub ↔ Magasin",
        hubTransfers: hubStoreMixedTransfers,
      },
    ],
    [interStoreTransfers, hubHubTransfers, hubStoreMixedTransfers]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: transferSites,
      destinationSites: transferSites,
    }),
    [transferSites]
  );

  function setTab(tab: SentTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {successMessage}
        </div>
      )}

      <div className="natus-mobile-tab-bar inline-flex w-full flex-wrap rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
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

      {activeTab === "new" && (
        <DirectorStockTransferManager
          retailStores={retailStores}
          hubStores={hubStores}
          products={products}
          sourceType={sourceType}
          destType={destType}
          fromStoreId={fromStoreId}
          fromHubStoreId={fromHubStoreId}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
        />
      )}

      {activeTab === "sent" && (
        <SentTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={locationConfig}
          productLookup={productLookup}
          managedStoreIds={retailStoreIds}
          livreurs={livreurs}
          workflowSplit="sent-source"
          storeActionMode="none"
          hubReadOnly
          emptyMessage="Aucune commande envoyée (hors « En attente » et « Reçu »)"
        />
      )}
    </div>
  );
}

export function DirectorSentOrdersTabs(props: {
  retailStores: StoreType[];
  hubStores: StoreType[];
  products: Product[];
  sourceType: "store" | "hub";
  destType: "store" | "hub";
  fromStoreId: string;
  fromHubStoreId: string;
  toStoreId: string;
  toHubStoreId: string;
  interStoreTransfers: StoreStockTransfer[];
  hubHubTransfers: HubStockTransfer[];
  hubStoreMixedTransfers: HubStockTransfer[];
  retailStoreIds: string[];
  transferSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  successMessage?: string;
}) {
  return (
    <Suspense fallback={null}>
      <DirectorSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
