"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, User } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import type { CashierWithStore } from "@/lib/scheduling/shifts";
import type { Store } from "@/lib/types";

export function PlanningFilterBar({
  stores,
  cashiers,
  selectedStoreId,
  selectedCashierId,
  className = "",
}: {
  stores: Store[];
  cashiers: CashierWithStore[];
  selectedStoreId: string;
  selectedCashierId: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storeOptions = [
    { value: "", label: "Tous les magasins", icon: MapPin },
    ...stores.map((s) => ({
      value: s.id,
      label: s.name,
      description: s.city,
      icon: MapPin,
    })),
  ];

  const cashiersForSelect = selectedStoreId
    ? cashiers.filter((c) => c.store_id === selectedStoreId)
    : cashiers;

  const cashierOptions = [
    { value: "", label: "Tous les caissiers", icon: User },
    ...cashiersForSelect.map((c) => ({
      value: c.id,
      label: c.full_name || c.email,
      description: c.store_name,
      icon: User,
    })),
  ];

  function updateParam(key: "store" | "cashier", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    if (key === "store" && value && selectedCashierId) {
      const stillVisible = cashiers.some(
        (c) => c.id === selectedCashierId && c.store_id === value
      );
      if (!stillVisible) params.delete("cashier");
    }

    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const selectedCashier = cashiers.find((c) => c.id === selectedCashierId);

  return (
    <div className={cn("natus-filter-bar overflow-visible p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">Filtrer le planning</p>
        <p className="text-sm text-muted">
          {selectedStore || selectedCashier ? (
            <>
              {selectedStore && (
                <span className="font-semibold text-foreground">{selectedStore.name}</span>
              )}
              {selectedStore && selectedCashier && " · "}
              {selectedCashier && (
                <span className="font-semibold text-foreground">
                  {selectedCashier.full_name || selectedCashier.email}
                </span>
              )}
            </>
          ) : (
            "Tous les magasins et caissiers"
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
        <SelectMenu
          label="Magasin"
          value={selectedStoreId}
          onChange={(value) => updateParam("store", value)}
          options={storeOptions}
          defaultIcon={MapPin}
          searchable={stores.length > 6}
          searchPlaceholder="Rechercher un magasin…"
        />
        <SelectMenu
          label="Caissier"
          value={selectedCashierId}
          onChange={(value) => updateParam("cashier", value)}
          options={cashierOptions}
          defaultIcon={User}
          searchable={cashiersForSelect.length > 6}
          searchPlaceholder="Rechercher un caissier…"
        />
      </div>
    </div>
  );
}
