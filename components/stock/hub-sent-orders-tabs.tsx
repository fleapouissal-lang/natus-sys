"use client";

import { Suspense, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PackagePlus } from "lucide-react";
import { HubWarehouseManager } from "@/components/hub/hub-warehouse-manager";
import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { cn } from "@/lib/utils";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import type { ReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import type { ReceivedTransferLocationSites } from "@/lib/stock-transfers/received-location-filters";
import type { HubStockTransfer, Product, Profile, Store } from "@/lib/types";

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

function HubSentOrdersTabsInner({
  hubStores,
  selectedHubStoreId,
  hubStore,
  products,
  retailStores,
  destinationHubStores,
  outgoingTransfers,
  sourceSites,
  destinationSites,
  scopeHubIds,
  livreurs,
  initialDestination,
  toStoreId,
  toHubStoreId,
  filter,
  productLookup,
  successMessage,
  pendingOrderId,
  initialQuantities,
  initialNotes,
}: {
  hubStores: Store[];
  selectedHubStoreId: string;
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  destinationHubStores: Store[];
  outgoingTransfers: HubStockTransfer[];
  sourceSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  scopeHubIds: string[];
  livreurs: Profile[];
  initialDestination: "store" | "hub";
  toStoreId: string;
  toHubStoreId: string;
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  successMessage?: string;
  pendingOrderId?: string;
  initialQuantities?: Record<string, string>;
  initialNotes?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab =
    tabParam === "sent" || tabParam === "store" || tabParam === "depot"
      ? "sent"
      : tabParam === "new"
        ? "new"
        : "new";

  const outgoingToStores = useMemo(
    () => outgoingTransfers.filter((transfer) => !transfer.to_store_is_hub),
    [outgoingTransfers]
  );

  const outgoingToHubs = useMemo(
    () => outgoingTransfers.filter((transfer) => transfer.to_store_is_hub),
    [outgoingTransfers]
  );

  const groups = useMemo(
    () => [
      { kind: "store" as const, typeLabel: "Vers magasin", hubTransfers: outgoingToStores },
      { kind: "hub" as const, typeLabel: "Vers dépôt", hubTransfers: outgoingToHubs },
    ],
    [outgoingToStores, outgoingToHubs]
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
      {successMessage && (
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {successMessage}
        </div>
      )}

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

      {hubStores.length > 1 && (
        <Suspense fallback={null}>
          <StoreFilterBar
            stores={hubStores}
            selectedStoreId={selectedHubStoreId}
            title="Dépôt source (nouveau transfert)"
            allowAll={false}
          />
        </Suspense>
      )}

      {activeTab === "new" && (
        <HubWarehouseManager
          hubStore={hubStore}
          products={products}
          retailStores={retailStores}
          destinationHubStores={destinationHubStores}
          initialDestination={initialDestination}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
          embedded
          pendingOrderId={pendingOrderId}
          initialQuantities={initialQuantities}
          initialNotes={initialNotes}
        />
      )}

      {activeTab === "sent" && (
        <SentTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={locationConfig}
          productLookup={productLookup}
          managedStoreIds={scopeHubIds}
          livreurs={livreurs}
          workflowSplit="sent-source"
          hubReadOnly={false}
          hubManageOutgoing
          emptyMessage={`Aucun transfert envoyé depuis le dépôt — ${hubStore.name}`}
        />
      )}
    </div>
  );
}

export function HubSentOrdersTabs(props: {
  hubStores: Store[];
  selectedHubStoreId: string;
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  destinationHubStores: Store[];
  outgoingTransfers: HubStockTransfer[];
  sourceSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  scopeHubIds: string[];
  livreurs: Profile[];
  initialDestination: "store" | "hub";
  toStoreId: string;
  toHubStoreId: string;
  filter: ReceivedTransfersFilterScope;
  productLookup?: ReceivedTransferProductLookup;
  successMessage?: string;
  pendingOrderId?: string;
  initialQuantities?: Record<string, string>;
  initialNotes?: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <HubSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
