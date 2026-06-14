"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Store } from "@/lib/types";

export function StoreStockAllocation({ stores }: { stores: Store[] }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const cities = useMemo(
    () => [...new Set(stores.map((s) => s.city))].sort(),
    [stores]
  );

  const payload = useMemo(
    () =>
      stores
        .map((store) => ({
          store_id: store.id,
          quantity: Math.max(0, parseInt(quantities[store.id] || "0", 10) || 0),
        }))
        .filter((row) => row.quantity > 0),
    [stores, quantities]
  );

  if (stores.length === 0) {
    return (
      <p className="text-sm text-danger">
        Aucun magasin disponible — créez un magasin avant d&apos;ajouter un produit
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="store_stocks" value={JSON.stringify(payload)} />
      <div>
        <p className="text-sm font-medium">Stock initial par magasin</p>
        <p className="text-xs text-muted">
          Chaque magasin a son propre stock. Laissez 0 si aucun stock pour ce magasin.
        </p>
      </div>

      {cities.map((city) => (
        <div key={city} className="border border-border bg-background/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{city}</p>
          </div>
          <div className="space-y-3">
            {stores
              .filter((store) => store.city === city)
              .map((store) => (
                <div key={store.id} className="grid gap-2 sm:grid-cols-[1fr_120px] sm:items-end">
                  <div>
                    <p className="text-sm font-medium">{store.name}</p>
                    {store.address && (
                      <p className="text-xs text-muted">{store.address}</p>
                    )}
                  </div>
                  <Input
                    label="Quantité"
                    type="number"
                    min="0"
                    value={quantities[store.id] ?? ""}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [store.id]: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      {payload.length > 0 && (
        <p className="text-xs text-success">
          {payload.length} magasin(s) recevront du stock ({payload.reduce((s, r) => s + r.quantity, 0)} unités)
        </p>
      )}
    </div>
  );
}
