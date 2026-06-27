"use client";

import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { cn } from "@/lib/utils";

export function CategoryMultiSelect({
  name = "categories",
  value,
  onChange,
  required = false,
  label = "Catégories",
  categories = PRODUCT_CATEGORIES,
}: {
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  label?: string;
  categories?: readonly string[];
}) {
  const selected = new Set(value);

  function toggle(category: string) {
    const next = new Set(selected);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    onChange([...next]);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = selected.has(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-foreground hover:border-primary/50"
              )}
            >
              {category}
            </button>
          );
        })}
      </div>
      {value.map((category) => (
        <input key={category} type="hidden" name={name} value={category} />
      ))}
      {required && value.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">Sélectionnez au moins une catégorie</p>
      )}
    </div>
  );
}
