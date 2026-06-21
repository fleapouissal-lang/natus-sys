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
  layout = "default",
}: {
  stores: Store[];
  selectedStoreId: string;
  className?: string;
  allowAll?: boolean;
  title?: string;
  showHeader?: boolean;
  /** Caisse / barre fine : titre à gauche, select à droite */
  layout?: "default" | "compact";
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

  const select = (
    <SelectMenu
      label={layout === "default" ? "Magasin" : undefined}
      value={selectedStoreId}
      onChange={handleChange}
      options={storeOptions(stores, {
        allLabel: "Tous les magasins",
        includeAll: allowAll,
      })}
      placeholder="Sélectionner un magasin"
      defaultIcon={MapPin}
      size="sm"
      searchable={stores.length > 6}
      searchPlaceholder="Rechercher un magasin..."
      className={cn(layout === "compact" && "w-full sm:w-[min(100%,16rem)]")}
      triggerClassName={cn(layout === "compact" && "min-w-[12rem]")}
    />
  );

  if (layout === "compact") {
    return (
      <div
        className={cn(
          "natus-filter-bar flex flex-wrap items-center justify-between gap-3 overflow-visible",
          className
        )}
      >
        {title ? (
          <p className="text-sm font-medium text-primary">{title}</p>
        ) : (
          <span className="sr-only">Filtrer par magasin</span>
        )}
        <div className="ml-auto w-full shrink-0 sm:w-auto">{select}</div>
      </div>
    );
  }

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
        {select}
      </div>
    </div>
  );
}
