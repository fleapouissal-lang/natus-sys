"use client";

import { Suspense, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PackagePlus } from "lucide-react";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import { cn } from "@/lib/utils";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { HubStockTransfer, Product, Profile, Store, StoreStockTransfer } from "@/lib/types";

type SentTab = "new" | "sent";

const TABS: {
  id: SentTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "new",
    label: "Nouveau transfert",
    shortLabel: "Nouveau",
    icon: PackagePlus,
  },
  {
    id: "sent",
    label: "Stock envoyé",
    shortLabel: "Envoyé",
    icon: ArrowRightLeft,
  },
];

function CashierSentOrdersTabsInner({
  storeId,
  storeName,
  storeSite,
  sourceStores,
  destinationStores,
  hubStores,
  products,
  fromStoreId,
  toStoreId,
  toHubStoreId,
  initialDestination,
  interStoreTransfers,
  storeToHubTransfers,
  destinationSites,
  livreurs,
  filter,
  productLookup,
}: {
  storeId: string;
  storeName: string;
  storeSite: ReceivedTransferLocationSites;
  sourceStores: Store[];
  destinationStores: Store[];
  hubStores: Store[];
  products: Product[];
  fromStoreId: string;
  toStoreId: string;
  toHubStoreId: string;
  initialDestination: "store" | "hub";
  interStoreTransfers: StoreStockTransfer[];
  storeToHubTransfers: HubStockTransfer[];
  destinationSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab =
    tabParam === "sent" || tabParam === "store" || tabParam === "hub"
      ? "sent"
      : tabParam === "new"
        ? "new"
        : "sent";

  const groups = useMemo(
    () => [
      {
        kind: "store" as const,
        typeLabel: "Vers magasin",
        storeTransfers: interStoreTransfers,
      },
      {
        kind: "depot" as const,
        typeLabel: "Vers dépôt",
        hubTransfers: storeToHubTransfers,
      },
    ],
    [interStoreTransfers, storeToHubTransfers]
  );

  const locationConfig = useMemo(
    () => ({
      sourceSites: [storeSite],
      destinationSites,
      lockSource: true,
    }),
    [storeSite, destinationSites]
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
          lockFromStore
          basePath="/cashier"
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
          managedStoreIds={[storeId]}
          livreurs={livreurs}
          workflowSplit="sent-source"
          storeActionMode="full"
          hubReadOnly={false}
          hubManageAsStoreSource
          emptyMessage={`Aucun transfert envoyé depuis ${storeName}`}
        />
      )}
    </div>
  );
}

export function CashierSentOrdersTabs(props: {
  storeId: string;
  storeName: string;
  storeSite: ReceivedTransferLocationSites;
  sourceStores: Store[];
  destinationStores: Store[];
  hubStores: Store[];
  products: Product[];
  fromStoreId: string;
  toStoreId: string;
  toHubStoreId: string;
  initialDestination: "store" | "hub";
  interStoreTransfers: StoreStockTransfer[];
  storeToHubTransfers: HubStockTransfer[];
  destinationSites: ReceivedTransferLocationSites[];
  livreurs: Profile[];
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
}) {
  return (
    <Suspense fallback={null}>
      <CashierSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
