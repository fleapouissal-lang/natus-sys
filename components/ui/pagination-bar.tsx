"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: "default" | "inline";
};

export function PaginationBar({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalItems,
  onPageChange,
  className,
  variant = "default",
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const isInline = variant === "inline";

  return (
    <div
      className={cn(
        isInline
          ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          : "flex flex-col items-center justify-center gap-3 text-center md:flex-row md:flex-wrap md:items-center md:justify-between md:text-left",
        !isInline && "border-t border-border px-6 py-4",
        className
      )}
    >
      <p
        className={cn(
          "text-sm text-muted",
          isInline ? "sm:shrink-0" : "w-full md:w-auto"
        )}
      >
        {rangeStart}–{rangeEnd} sur {totalItems}
      </p>
      <div
        className={cn(
          "flex items-center gap-2",
          isInline ? "w-full sm:w-auto sm:justify-end" : "w-full justify-center md:w-auto"
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        <span className="min-w-[5rem] text-center text-sm text-muted">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="gap-1"
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
