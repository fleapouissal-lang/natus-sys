"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PackagePlus, Warehouse } from "lucide-react";
import { HubWarehouseManager } from "@/components/hub/hub-warehouse-manager";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Product, Profile, Store } from "@/lib/types";

type SentTab = "new" | "store" | "depot";

const TABS: {
  id: SentTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "new",
    label: "Entrepôt (nouveau transfert)",
    shortLabel: "Entrepôt",
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

function HubSentOrdersTabsInner({
  hubStores,
  selectedHubStoreId,
  hubStore,
  products,
  retailStores,
  destinationHubStores,
  outgoingToStores,
  outgoingToHubs,
  livreurs,
  initialDestination,
  toStoreId,
  toHubStoreId,
  successMessage,
}: {
  hubStores: Store[];
  selectedHubStoreId: string;
  hubStore: Store;
  products: Product[];
  retailStores: Store[];
  destinationHubStores: Store[];
  outgoingToStores: HubStockTransfer[];
  outgoingToHubs: HubStockTransfer[];
  livreurs: Profile[];
  initialDestination: "store" | "hub";
  toStoreId: string;
  toHubStoreId: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab =
    tabParam === "store" || tabParam === "depot" || tabParam === "new" ? tabParam : "new";

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
            title="Dépôt source"
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
        />
      )}

      {activeTab === "store" && (
        <HubTransfersList
          title="Commandes envoyées vers un magasin"
          transfers={outgoingToStores}
          allowManage
          allowRepair
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage={`Aucun envoi vers un magasin depuis ${hubStore.name}`}
        />
      )}

      {activeTab === "depot" && (
        <HubTransfersList
          title="Commandes envoyées vers un dépôt"
          transfers={outgoingToHubs}
          allowManage
          allowRepair
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage={`Aucun envoi vers un autre dépôt depuis ${hubStore.name}`}
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
  outgoingToStores: HubStockTransfer[];
  outgoingToHubs: HubStockTransfer[];
  livreurs: Profile[];
  initialDestination: "store" | "hub";
  toStoreId: string;
  toHubStoreId: string;
  successMessage?: string;
}) {
  return (
    <Suspense fallback={null}>
      <HubSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
