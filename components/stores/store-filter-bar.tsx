"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { storeOptions } from "@/lib/select-options";
import type { Store } from "@/lib/types";

export function StoreFilterBar({
  stores,
  selectedStoreId,
  className = "",
  allowAll = false,
}: {
  stores: Store[];
  selectedStoreId: string;
  className?: string;
  allowAll?: boolean;
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
    <Card className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="font-medium">Magasin</p>
          {selected ? (
            <p className="text-xs text-muted">
              {selected.name} — {selected.city}
            </p>
          ) : allowAll ? (
            <p className="text-xs text-muted">Tous les magasins</p>
          ) : null}
        </div>
      </div>
      <SelectMenu
        value={selectedStoreId}
        onChange={handleChange}
        options={storeOptions(stores, {
          allLabel: "Tous les magasins",
          includeAll: allowAll,
        })}
        placeholder="Sélectionner un magasin"
        defaultIcon={MapPin}
        className="w-full sm:w-72"
      />
    </Card>
  );
}
