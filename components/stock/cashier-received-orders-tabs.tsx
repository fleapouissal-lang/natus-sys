"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Warehouse } from "lucide-react";
import { CashierStockTransfers } from "@/components/cashier/cashier-stock-transfers";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { cn } from "@/lib/utils";
import type { HubStockTransfer, Product, StoreStockTransfer } from "@/lib/types";

type ReceivedTab = "store" | "hub";

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
    icon: ArrowRightLeft,
  },
  {
    id: "hub",
    label: "Transferts Hub → Magasin",
    shortLabel: "Hub → Mag.",
    icon: Warehouse,
  },
];

function CashierReceivedOrdersTabsInner({
  storeId,
  storeName,
  interStoreTransfers,
  hubToStoreTransfers,
  productsById,
  storeStockByProductId,
}: {
  storeId: string;
  storeName: string;
  interStoreTransfers: StoreStockTransfer[];
  hubToStoreTransfers: HubStockTransfer[];
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ReceivedTab = tabParam === "hub" || tabParam === "store" ? tabParam : "store";

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

      {activeTab === "store" && (
        <StoreTransfersList
          title="Transferts inter-magasins"
          perspective="incoming"
          managedStoreIds={[storeId]}
          transfers={interStoreTransfers}
          actionMode="receive-only"
          emptyMessage="Aucun transfert reçu d'un autre magasin"
        />
      )}

      {activeTab === "hub" && (
        <CashierStockTransfers
          variant="section"
          transfers={hubToStoreTransfers}
          storeName={storeName}
          productsById={productsById}
          storeStockByProductId={storeStockByProductId}
        />
      )}
    </div>
  );
}

export function CashierReceivedOrdersTabs(props: {
  storeId: string;
  storeName: string;
  interStoreTransfers: StoreStockTransfer[];
  hubToStoreTransfers: HubStockTransfer[];
  productsById: Record<string, Pick<Product, "id" | "name" | "barcode" | "image_url" | "category">>;
  storeStockByProductId: Record<string, number>;
}) {
  return (
    <Suspense fallback={null}>
      <CashierReceivedOrdersTabsInner {...props} />
    </Suspense>
  );
}
