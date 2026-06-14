"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Store } from "@/lib/types";

export function CityStoreFilterBar({
  stores,
  selectedCity,
  selectedStoreId,
}: {
  stores: Store[];
  selectedCity: string;
  selectedStoreId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cities = [...new Set(stores.map((s) => s.city))].sort();
  const storesInCity = selectedCity
    ? stores.filter((s) => s.city === selectedCity)
    : stores;

  function updateParams(updates: { city?: string; store?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.city !== undefined) {
      if (updates.city) params.set("city", updates.city);
      else params.delete("city");
      params.delete("store");
    }

    if (updates.store !== undefined) {
      if (updates.store) params.set("store", updates.store);
      else params.delete("store");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Card className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Filtres activité</p>
          <p className="text-xs text-muted">
            Par ville ou magasin — gérants et caissiers
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <label className="mb-1.5 block text-sm font-medium">Ville</label>
          <select
            value={selectedCity}
            onChange={(e) => updateParams({ city: e.target.value })}
            className="w-full border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Toutes les villes</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-sm font-medium">Magasin</label>
          <select
            value={selectedStoreId}
            onChange={(e) => updateParams({ store: e.target.value })}
            className="w-full border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">
              {selectedCity ? `Tous — ${selectedCity}` : "Tous les magasins"}
            </option>
            {storesInCity.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
