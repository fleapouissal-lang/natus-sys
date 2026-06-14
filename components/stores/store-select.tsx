"use client";

import { useState } from "react";
import { SelectMenu } from "@/components/ui/select-menu";
import { storeOptions } from "@/lib/select-options";
import type { Store } from "@/lib/types";

export function StoreSelect({
  stores,
  value,
  onChange,
  name = "store_id",
  label = "Magasin",
  required = true,
  className = "",
}: {
  stores: Store[];
  value?: string;
  onChange?: (storeId: string) => void;
  name?: string;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState(value || "");
  const current = value ?? internal;

  return (
    <SelectMenu
      name={name}
      label={label}
      required={required}
      value={current}
      onChange={(next) => {
        setInternal(next);
        onChange?.(next);
      }}
      options={storeOptions(stores, {
        allLabel: "Sélectionner un magasin",
        includeAll: true,
        showCity: true,
      })}
      placeholder="Sélectionner un magasin"
      className={className}
    />
  );
}
