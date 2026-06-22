"use client";

import { ShoppingBag } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export function PosLuxuryCartFab({
  itemCount,
  totalLabel,
  onClick,
  className,
}: {
  itemCount: number;
  totalLabel: string;
  onClick: () => void;
  className?: string;
}) {
  if (itemCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir le panier, ${itemCount} articles, ${totalLabel}`}
      className={cn(
        "natus-pos-luxury-fab fixed z-50 flex items-center gap-3 md:hidden",
        className
      )}
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary text-white shadow-[0_8px_32px_rgba(179,140,74,0.45)]">
        <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-page bg-champagne px-1 text-[11px] font-bold text-black">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      </span>
      <span className="natus-pos-luxury-fab-total rounded-full border border-primary/25 bg-surface px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
        <span className="block text-[10px] font-medium uppercase tracking-widest text-muted">
          Panier
        </span>
        <span className="font-heading text-base font-bold text-primary">{totalLabel}</span>
      </span>
    </button>
  );
}
