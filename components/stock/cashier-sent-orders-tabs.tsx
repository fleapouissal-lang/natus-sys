"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Warehouse } from "lucide-react";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Profile, StoreStockTransfer } from "@/lib/types";

type SentTab = "store" | "hub";

const TABS: {
  id: SentTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "store",
    label: "Transferts inter-magasins",
    shortLabel: "Magasins",
    icon: ArrowRightLeft,
  },
  {
    id: "hub",
    label: "Transferts Magasin → Hub",
    shortLabel: "→ Hub",
    icon: Warehouse,
  },
];

function CashierSentOrdersTabsInner({
  storeId,
  interStoreTransfers,
  storeToHubTransfers,
  livreurs,
}: {
  storeId: string;
  interStoreTransfers: StoreStockTransfer[];
  storeToHubTransfers: HubStockTransfer[];
  livreurs: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab = tabParam === "hub" || tabParam === "store" ? tabParam : "store";

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

      {activeTab === "store" && (
        <StoreTransfersList
          title="Transferts inter-magasins"
          perspective="outgoing"
          managedStoreIds={[storeId]}
          transfers={interStoreTransfers}
          livreurs={livreurs}
          actionMode="full"
          emptyMessage="Aucun transfert envoyé vers un autre magasin"
        />
      )}

      {activeTab === "hub" && (
        <HubTransfersList
          title="Transferts Magasin → Hub"
          transfers={storeToHubTransfers}
          allowManage
          manageAsStoreSource
          showOrigin
          showProductImages
          livreurs={livreurs}
          emptyMessage="Aucun envoi vers un dépôt hub"
        />
      )}
    </div>
  );
}

export function CashierSentOrdersTabs(props: {
  storeId: string;
  interStoreTransfers: StoreStockTransfer[];
  storeToHubTransfers: HubStockTransfer[];
  livreurs: Profile[];
}) {
  return (
    <Suspense fallback={null}>
      <CashierSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
