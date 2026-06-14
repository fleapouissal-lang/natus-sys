"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
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
      <select
        value={selectedStoreId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full sm:w-64 border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {allowAll && <option value="">Tous les magasins</option>}
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name} ({store.city})
          </option>
        ))}
      </select>
    </Card>
  );
}
