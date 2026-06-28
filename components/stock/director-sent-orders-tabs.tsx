"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, PackagePlus, Store, Warehouse } from "lucide-react";
import { DirectorStockTransferManager } from "@/components/stock/director-stock-transfer-manager";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Product, Profile, Store as StoreType, StoreStockTransfer } from "@/lib/types";

type SentTab = "new" | "store" | "hub" | "mixed";

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
  livreurs,
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
  livreurs: Profile[];
  successMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SentTab =
    tabParam === "store" || tabParam === "hub" || tabParam === "mixed" || tabParam === "new"
      ? tabParam
      : "new";

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

      {activeTab === "store" && (
        <StoreTransfersList
          title="Transferts inter-magasins"
          perspective="all"
          managedStoreIds={retailStoreIds}
          transfers={interStoreTransfers}
          actionMode="none"
          livreurs={livreurs}
          emptyMessage="Aucun transfert magasin → magasin en cours"
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
          emptyMessage="Aucun transfert dépôt → dépôt en cours"
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
          emptyMessage="Aucun transfert hub ↔ magasin en cours"
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
  livreurs: Profile[];
  successMessage?: string;
}) {
  return (
    <Suspense fallback={null}>
      <DirectorSentOrdersTabsInner {...props} />
    </Suspense>
  );
}
