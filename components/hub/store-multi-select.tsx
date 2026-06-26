"use client";

import { Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Store as StoreType } from "@/lib/types";

export function StoreMultiSelect({
  stores,
  value,
  onChange,
  required = false,
  label = "Magasins rattachés",
  showCity = false,
  emptyMessage = "Aucun magasin retail dans cette ville.",
}: {
  stores: StoreType[];
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  label?: string;
  showCity?: boolean;
  emptyMessage?: string;
}) {
  const selected = new Set(value);
  const allSelected = stores.length > 0 && stores.every((store) => selected.has(store.id));

  function toggle(storeId: string) {
    const next = new Set(selected);
    if (next.has(storeId)) {
      next.delete(storeId);
    } else {
      next.add(storeId);
    }
    onChange([...next]);
  }

  function selectAll() {
    onChange(stores.map((store) => store.id));
  }

  function clearAll() {
    onChange([]);
  }

  if (stores.length === 0) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={clearAll}>
            Tout retirer
          </Button>
        </div>
      </div>

      <p className="mb-2 text-xs text-muted">
        {value.length} / {stores.length} magasin{stores.length !== 1 ? "s" : ""} sélectionné
        {value.length !== 1 ? "s" : ""}
        {allSelected ? " · toute la ville" : ""}
      </p>

      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
        {stores.map((store) => {
          const active = selected.has(store.id);
          return (
            <label
              key={store.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                active
                  ? "border-primary/40 bg-primary-light/20"
                  : "border-transparent hover:bg-primary-light/10"
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(store.id)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {store.name}
                  {showCity && store.city && (
                    <span className="text-xs font-normal text-muted">· {store.city}</span>
                  )}
                </span>
                {store.address && (
                  <span className="mt-0.5 block text-xs text-muted">{store.address}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {value.map((storeId) => (
        <input key={storeId} type="hidden" name="hub_store_ids" value={storeId} />
      ))}

      {required && value.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">Sélectionnez au moins un magasin</p>
      )}
    </div>
  );
}
