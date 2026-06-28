"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Store, Warehouse } from "lucide-react";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Profile, StoreStockTransfer } from "@/lib/types";

type ReceivedTab = "store" | "hub" | "mixed";

const TABS: {
  id: ReceivedTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "store",
    label: "Transferts inter-magasins",
    shortLabel: "Magasins",
    icon: Store,
  },
  {
    id: "hub",
    label: "Transferts entre Hubs",
    shortLabel: "Hubs",
    icon: Warehouse,
  },
  {
    id: "mixed",
    label: "Transferts Hub ↔ Magasin",
    shortLabel: "Hub ↔ Mag.",
    icon: ArrowRightLeft,
  },
];

function DirectorReceivedOrdersTabsInner({
  interStoreTransfers,
  hubHubTransfers,
  hubStoreMixedTransfers,
  retailStoreIds,
  livreurs,
}: {
  interStoreTransfers: StoreStockTransfer[];
  hubHubTransfers: HubStockTransfer[];
  hubStoreMixedTransfers: HubStockTransfer[];
  retailStoreIds: string[];
  livreurs: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ReceivedTab =
    tabParam === "hub" || tabParam === "mixed" || tabParam === "store" ? tabParam : "store";

  function setTab(tab: ReceivedTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
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

      {activeTab === "store" && (
        <StoreTransfersList
          title="Transferts inter-magasins"
          perspective="all"
          managedStoreIds={retailStoreIds}
          transfers={interStoreTransfers}
          actionMode="none"
          livreurs={livreurs}
          emptyMessage="Aucun transfert inter-magasins livré ou reçu"
        />
      )}

      {activeTab === "hub" && (
        <HubTransfersList
          title="Transferts entre Hubs"
          transfers={hubHubTransfers}
          readOnly
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage="Aucun transfert hub → hub livré ou reçu"
        />
      )}

      {activeTab === "mixed" && (
        <HubTransfersList
          title="Transferts Hub ↔ Magasin"
          transfers={hubStoreMixedTransfers}
          readOnly
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage="Aucun transfert hub ↔ magasin livré ou reçu"
        />
      )}
    </div>
  );
}

export function DirectorReceivedOrdersTabs(props: {
  interStoreTransfers: StoreStockTransfer[];
  hubHubTransfers: HubStockTransfer[];
  hubStoreMixedTransfers: HubStockTransfer[];
  retailStoreIds: string[];
  livreurs: Profile[];
}) {
  return (
    <Suspense fallback={null}>
      <DirectorReceivedOrdersTabsInner {...props} />
    </Suspense>
  );
}
