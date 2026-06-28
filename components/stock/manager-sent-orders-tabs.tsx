"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PackagePlus, Warehouse } from "lucide-react";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Product, Profile, Store, StoreStockTransfer } from "@/lib/types";

type SentTab = "new" | "store" | "depot";

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
    id: "store",
    label: "Commandes envoyées vers un magasin",
    shortLabel: "Magasin",
    icon: ArrowRightLeft,
  },
  {
    id: "depot",
    label: "Commandes envoyées vers un dépôt",
    shortLabel: "Dépôt",
    icon: Warehouse,
  },
];

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
  livreurs,
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
  livreurs: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab =
    tabParam === "store" || tabParam === "depot" || tabParam === "new"
      ? tabParam
      : "new";

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

      {activeTab === "store" && (
        <StoreTransfersList
          title="Commandes envoyées vers un magasin"
          perspective="outgoing"
          managedStoreIds={managedStoreIds}
          transfers={storeTransfers}
          actionMode="none"
          livreurs={livreurs}
          emptyMessage="Aucune commande envoyée vers un autre magasin"
        />
      )}

      {activeTab === "depot" && (
        <HubTransfersList
          title="Commandes envoyées vers un dépôt"
          transfers={hubOutgoingTransfers}
          readOnly
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage="Aucun envoi vers un dépôt"
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
  livreurs: Profile[];
}) {
  return (
    <Suspense fallback={null}>
      <ManagerSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
