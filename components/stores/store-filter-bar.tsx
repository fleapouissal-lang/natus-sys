"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { storeOptions } from "@/lib/select-options";
import { cn } from "@/lib/utils";
import type { Store } from "@/lib/types";

export function StoreFilterBar({
  stores,
  selectedStoreId,
  className = "",
  allowAll = false,
  title = "Filtrer par magasin",
  showHeader = true,
}: {
  stores: Store[];
  selectedStoreId: string;
  className?: string;
  allowAll?: boolean;
  title?: string;
  showHeader?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (stores.length === 0) return null;

  function handleChange(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (storeId) {
      params.set("store", storeId);
    } else {
      params.delete("store");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const selected = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className={cn("natus-filter-bar overflow-visible p-4", className)}>
      {showHeader && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary">{title}</p>
          <p className="text-sm text-muted">
            {selected ? (
              <>
                <span className="font-semibold text-foreground">{selected.name}</span>
                {" — "}
                {selected.city}
              </>
            ) : allowAll ? (
              "Tous les magasins"
            ) : (
              "Aucun magasin sélectionné"
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-end">
        <SelectMenu
          label="Magasin"
          value={selectedStoreId}
          onChange={handleChange}
          options={storeOptions(stores, {
            allLabel: "Tous les magasins",
            includeAll: allowAll,
          })}
          placeholder="Sélectionner un magasin"
          defaultIcon={MapPin}
          size="sm"
        />
      </div>
    </div>
  );
}
