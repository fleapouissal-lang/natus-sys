"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import type { Store } from "@/lib/types";

export function PlanningFilterBar({
  stores,
  selectedStoreId,
  className = "",
}: {
  stores: Store[];
  selectedStoreId: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storeOptions = stores.map((s) => ({
    value: s.id,
    label: s.name,
    description: s.city,
    icon: MapPin,
  }));

  function updateStore(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("store", value);
    else params.delete("store");
    params.delete("cashier");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className={cn("natus-filter-bar overflow-visible p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">Magasin</p>
        <p className="text-sm text-muted">
          {selectedStore ? (
            <>
              Planning de{" "}
              <span className="font-semibold text-foreground">{selectedStore.name}</span>
            </>
          ) : (
            "Choisissez le magasin à planifier"
          )}
        </p>
      </div>

      <SelectMenu
        label="Magasin principal"
        value={selectedStoreId}
        onChange={updateStore}
        options={storeOptions}
        defaultIcon={MapPin}
        searchable={stores.length > 6}
        searchPlaceholder="Rechercher un magasin…"
        placeholder="Sélectionner un magasin…"
      />
    </div>
  );
}
