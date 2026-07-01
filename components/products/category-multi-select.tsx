"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Tag, X } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import { cn } from "@/lib/utils";

function formatCategory(raw: string) {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function CategoryMultiSelect({
  name = "categories",
  value,
  onChange,
  required = false,
  label = "Catégories",
  categories = PRODUCT_CATEGORIES,
  allowCreate = false,
  createHint = "Choisissez une ou plusieurs catégories, ou créez-en une nouvelle.",
  error,
}: {
  name?: string;
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  label?: string;
  categories?: readonly string[];
  allowCreate?: boolean;
  createHint?: string;
  error?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selected = useMemo(() => new Set(value), [value]);

  const options = useMemo(() => {
    const merged = new Set<string>(categories);
    for (const category of value) merged.add(category);
    return [...merged].sort((a, b) => a.localeCompare(b, "fr"));
  }, [categories, value]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < maxHeight && rect.top > spaceBelow;
    setPanelStyle({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - gap : rect.bottom + gap,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setCreating(false);
    }
    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (creating) requestAnimationFrame(() => newInputRef.current?.focus());
  }, [creating]);

  function toggle(category: string) {
    const next = new Set(selected);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onChange([...next]);
  }

  function removeCategory(category: string) {
    onChange(value.filter((c) => c !== category));
  }

  function addNewCategory() {
    const formatted = formatCategory(newCategory);
    if (formatted.length < 2) return;
    if (!selected.has(formatted)) onChange([...value, formatted]);
    setNewCategory("");
    setCreating(false);
  }

  const panel =
    open && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] overflow-hidden rounded-xl border border-primary bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(179,140,74,0.12)]"
            style={{ left: panelStyle.left, top: panelStyle.top, width: panelStyle.width }}
            role="listbox"
            aria-multiselectable
          >
            {createHint && (
              <p className="border-b border-border bg-background/60 px-3 py-2 text-xs text-muted">
                {createHint}
              </p>
            )}

            <ul className="select-menu-scroll max-h-[240px] overflow-y-auto p-2">
              {options.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">
                  Aucune catégorie — créez-en une ci-dessous.
                </li>
              ) : (
                options.map((category) => {
                  const active = selected.has(category);
                  return (
                    <li key={category} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => toggle(category)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer",
                          active ? "bg-champagne text-black" : "hover:bg-champagne/60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-primary/40 bg-surface"
                          )}
                        >
                          {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {allowCreate && (
              <div className="border-t border-border p-2">
                {creating ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={newInputRef}
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addNewCategory();
                        }
                      }}
                      placeholder="Nom de la catégorie…"
                      className="natus-field natus-field--sm w-full bg-surface px-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      disabled={formatCategory(newCategory).length < 2}
                      title="Ajouter la catégorie"
                      aria-label="Ajouter la catégorie"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary bg-primary text-white transition-colors hover:brightness-95 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5 cursor-pointer"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary/40">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    Ajouter une nouvelle catégorie
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>

      {value.map((category) => (
        <input key={category} type="hidden" name={name} value={category} />
      ))}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "select-menu-trigger natus-field flex w-full items-center gap-2 bg-surface px-3 text-left text-sm transition-all hover:border-primary focus:outline-none",
          open && "ring-2 ring-primary/15",
          error && "border-danger focus:border-danger focus:ring-danger/15"
        )}
      >
        <Tag className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
        <span className={cn("min-w-0 flex-1 truncate", value.length === 0 && "text-muted")}>
          {value.length === 0
            ? "Sélectionner des catégories…"
            : `${value.length} catégorie${value.length > 1 ? "s" : ""} sélectionnée${value.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
        />
      </button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.06] py-1 pl-3 pr-1.5 text-xs font-medium text-primary-dark"
            >
              {category}
              <button
                type="button"
                onClick={() => removeCategory(category)}
                title={`Retirer ${category}`}
                aria-label={`Retirer ${category}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary cursor-pointer"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        required &&
        value.length === 0 && (
          <p className="text-xs text-muted">Sélectionnez ou créez au moins une catégorie</p>
        )
      )}

      {panel}
    </div>
  );
}
