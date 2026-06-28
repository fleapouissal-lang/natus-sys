"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Store as StoreIcon, Warehouse } from "lucide-react";
import { StoresManager } from "@/components/stores/stores-manager";
import { HubAccountsManager } from "@/components/hub/hub-accounts-manager";
import { cn } from "@/lib/utils";
import type { Product, Profile, Store, StoreWithStats } from "@/lib/types";

type StructuresTab = "stores" | "hubs";

const TABS: {
  id: StructuresTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "stores", label: "Magasins", icon: StoreIcon },
  { id: "hubs", label: "Dépôts (Hubs)", icon: Warehouse },
];

type DirectorStructuresTabsProps = {
  stores: StoreWithStats[];
  inventoryByStore: Record<string, Product[]>;
  allowedCities: string[];
  defaultCity?: string;
  cityLabel?: string;
  canCreateStore: boolean;
  hubAccounts: Profile[];
  retailStores: Store[];
  assignmentsByHub: Record<string, string[]>;
};

function DirectorStructuresTabsInner({
  stores,
  inventoryByStore,
  allowedCities,
  defaultCity,
  cityLabel,
  canCreateStore,
  hubAccounts,
  retailStores,
  assignmentsByHub,
}: DirectorStructuresTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: StructuresTab = tabParam === "hubs" ? "hubs" : "stores";

  function setTab(tab: StructuresTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "stores") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-6">
      <div className="natus-mobile-tab-bar inline-flex w-full flex-wrap rounded-2xl border border-primary/25 bg-surface/80 p-1 shadow-[0_4px_20px_rgba(179,140,74,0.08)] backdrop-blur-sm sm:w-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
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
            {label}
          </button>
        ))}
      </div>

      {activeTab === "stores" ? (
        <StoresManager
          stores={stores}
          inventoryByStore={inventoryByStore}
          allowedCities={allowedCities}
          defaultCity={defaultCity}
          cityLabel={cityLabel}
          canCreateStore={canCreateStore}
        />
      ) : (
        <HubAccountsManager
          hubAccounts={hubAccounts}
          retailStores={retailStores}
          assignmentsByHub={assignmentsByHub}
        />
      )}
    </div>
  );
}

export function DirectorStructuresTabs(props: DirectorStructuresTabsProps) {
  return (
    <Suspense fallback={null}>
      <DirectorStructuresTabsInner {...props} />
    </Suspense>
  );
}
