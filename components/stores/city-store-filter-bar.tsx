"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { cityOptions, storeOptions } from "@/lib/select-options";
import type { Store } from "@/lib/types";

export function CityStoreFilterBar({
  stores,
  selectedCity,
  selectedStoreId,
  showCity = true,
  showStore = true,
  title = "Filtres activité",
  description = "Par ville ou magasin — gérants et caissiers",
}: {
  stores: Store[];
  selectedCity: string;
  selectedStoreId: string;
  showCity?: boolean;
  showStore?: boolean;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cities = [...new Set(stores.map((s) => s.city))].sort();
  const storesInCity = selectedCity
    ? stores.filter((s) => s.city === selectedCity)
    : stores;

  const storeSelectOptions = storeOptions(
    showCity ? storesInCity : stores,
    {
      allLabel: showCity && selectedCity ? `Tous — ${selectedCity}` : "Tous les magasins",
      includeAll: true,
      showCity: showCity && !selectedCity,
    }
  );

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
    <Card className="natus-filter-bar flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {showCity && (
          <SelectMenu
            label="Ville"
            value={selectedCity}
            onChange={(city) => updateParams({ city })}
            options={cityOptions(cities)}
            className="w-full sm:w-52"
            size="sm"
          />
        )}

        {showStore && (
          <SelectMenu
            label="Magasin"
            value={selectedStoreId}
            onChange={(store) => updateParams({ store })}
            options={storeSelectOptions}
            className="w-full sm:w-64"
            size="sm"
          />
        )}
      </div>
    </Card>
  );
}
