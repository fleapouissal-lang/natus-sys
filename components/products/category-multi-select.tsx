"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CategoryMultiSelect({
  name = "categories",
  value,
  onChange,
  required = false,
  label = "Catégories",
  categories = PRODUCT_CATEGORIES,
  allowCreate = false,
  createHint = "Créez une catégorie si elle n'existe pas encore dans la liste.",
}: {
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  label?: string;
  categories?: readonly string[];
  allowCreate?: boolean;
  createHint?: string;
}) {
  const [newCategory, setNewCategory] = useState("");
  const selected = new Set(value);

  const options = useMemo(() => {
    const merged = new Set<string>(categories);
    for (const category of value) merged.add(category);
    return [...merged].sort((a, b) => a.localeCompare(b, "fr"));
  }, [categories, value]);

  function toggle(category: string) {
    const next = new Set(selected);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    onChange([...next]);
  }

  function addNewCategory() {
    const trimmed = newCategory.replace(/\s+/g, " ").trim();
    if (trimmed.length < 2) return;
    const formatted = trimmed
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");

    if (!selected.has(formatted)) {
      onChange([...value, formatted]);
    }
    setNewCategory("");
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </p>

      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((category) => {
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
      ) : (
        <p className="text-sm text-muted">Aucune catégorie en base — créez-en une ci-dessous.</p>
      )}

      {allowCreate && (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-primary/25 bg-page/60 p-3">
          <p className="text-xs text-muted">{createHint}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Nouvelle catégorie"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex. Parfum"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewCategory();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="sm:mb-0.5"
              onClick={addNewCategory}
              disabled={newCategory.trim().length < 2}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      )}

      {value.map((category) => (
        <input key={category} type="hidden" name={name} value={category} />
      ))}

      {required && value.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">Sélectionnez ou créez au moins une catégorie</p>
      )}
    </div>
  );
}
