"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Warehouse } from "lucide-react";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { HubOrdersView } from "@/components/hub/hub-orders-view";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Store, StoreStockTransfer } from "@/lib/types";

type ReceivedTab = "depot" | "store";

const TABS: {
  id: ReceivedTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "depot",
    label: "Commandes reçues dépôt",
    shortLabel: "Dépôt",
    icon: Warehouse,
  },
  {
    id: "store",
    label: "Transfert inter-magasin",
    shortLabel: "Magasins",
    icon: ArrowRightLeft,
  },
];

function ManagerReceivedOrdersTabsInner({
  stores,
  selectedStoreId,
  scopeLabel,
  hubTransfers,
  storeTransfers,
  storeIds,
}: {
  stores: Store[];
  selectedStoreId: string;
  scopeLabel: string;
  hubTransfers: HubStockTransfer[];
  storeTransfers: StoreStockTransfer[];
  storeIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ReceivedTab =
    tabParam === "store" || tabParam === "depot" ? tabParam : "depot";

  function setTab(tab: ReceivedTab) {
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

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={selectedStoreId} allowAll={stores.length > 1} />
      </Suspense>

      {activeTab === "depot" ? (
        <HubOrdersView
          transfers={hubTransfers}
          title="Commandes reçues dépôt"
          description={`Envois entrepôt vers ${scopeLabel}`}
          readOnly
          showOrigin
          showProductImages
        />
      ) : (
        <StoreTransfersList
          title="Transfert inter-magasin"
          perspective="incoming"
          managedStoreIds={storeIds}
          transfers={storeTransfers}
          emptyMessage="Aucune commande reçue d'un autre magasin"
        />
      )}
    </div>
  );
}

export function ManagerReceivedOrdersTabs(props: {
  stores: Store[];
  selectedStoreId: string;
  scopeLabel: string;
  hubTransfers: HubStockTransfer[];
  storeTransfers: StoreStockTransfer[];
  storeIds: string[];
}) {
  return (
    <Suspense fallback={null}>
      <ManagerReceivedOrdersTabsInner {...props} />
    </Suspense>
  );
}
