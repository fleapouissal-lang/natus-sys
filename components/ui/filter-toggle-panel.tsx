"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FilterTogglePanelProps = {
  toggleLabel?: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function FilterTogglePanel({
  toggleLabel = "Afficher les filtres",
  summary,
  defaultOpen = false,
  collapsible = true,
  children,
  className,
  footer,
}: FilterTogglePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className={cn("space-y-0", className)}>
        {children}
        {footer}
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 md:hidden",
          !open && "natus-filter-bar px-3 py-2.5"
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          {open ? "Masquer les filtres" : toggleLabel}
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </Button>
        {!open && summary ? (
          <div className="min-w-0 flex-1 truncate text-right text-sm text-muted">
            {summary}
          </div>
        ) : null}
      </div>
      <div className={cn(!open && "hidden md:block")}>{children}</div>
      {footer ? (
        <div className="natus-filter-bar border-t border-border/60 px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
