"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Warehouse } from "lucide-react";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Profile, Store } from "@/lib/types";

type ReceivedTab = "store" | "depot";

const TABS: {
  id: ReceivedTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "store",
    label: "Commandes reçues à un magasin",
    shortLabel: "Magasin",
    icon: ArrowRightLeft,
  },
  {
    id: "depot",
    label: "Commandes reçues au dépôt",
    shortLabel: "Dépôt",
    icon: Warehouse,
  },
];

function HubReceivedOrdersTabsInner({
  hubStores,
  selectedHubStoreId,
  scopeLabel,
  incomingToStores,
  incomingToDepot,
  livreurs,
}: {
  hubStores: Store[];
  selectedHubStoreId: string;
  scopeLabel: string;
  incomingToStores: HubStockTransfer[];
  incomingToDepot: HubStockTransfer[];
  livreurs: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ReceivedTab = tabParam === "depot" || tabParam === "store" ? tabParam : "store";

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

      {hubStores.length > 1 && (
        <Suspense fallback={null}>
          <StoreFilterBar
            stores={hubStores}
            selectedStoreId={selectedHubStoreId}
            title="Dépôt"
            allowAll={hubStores.length > 1}
          />
        </Suspense>
      )}

      {activeTab === "store" && (
        <HubTransfersList
          title="Commandes reçues à un magasin"
          transfers={incomingToStores}
          readOnly
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage={`Aucune livraison dépôt → magasin pour ${scopeLabel}`}
        />
      )}

      {activeTab === "depot" && (
        <HubTransfersList
          title="Commandes reçues au dépôt"
          transfers={incomingToDepot}
          allowManage
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage={`Aucune réception magasin → ${scopeLabel}`}
        />
      )}
    </div>
  );
}

export function HubReceivedOrdersTabs(props: {
  hubStores: Store[];
  selectedHubStoreId: string;
  scopeLabel: string;
  incomingToStores: HubStockTransfer[];
  incomingToDepot: HubStockTransfer[];
  livreurs: Profile[];
}) {
  return (
    <Suspense fallback={null}>
      <HubReceivedOrdersTabsInner {...props} />
    </Suspense>
  );
}
