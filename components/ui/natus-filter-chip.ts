import { cn } from "@/lib/utils";

/** Boutons filtre période — même fond champagne que les actions caisse, sans bordure. */
export function natusFilterChipClass(active: boolean): string {
  return cn(
    "rounded-md border-0 px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
    "bg-champagne text-black hover:brightness-95",
    active ? "font-semibold shadow-sm" : "opacity-55 hover:opacity-100"
  );
}
