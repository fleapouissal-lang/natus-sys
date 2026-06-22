"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaginationBar({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalItems,
  onPageChange,
  className = "border-t border-border px-6 py-4",
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalItems === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        "md:flex-row md:flex-wrap md:items-center md:justify-between md:text-left",
        className
      )}
    >
      <p className="w-full text-sm text-muted md:w-auto">
        {rangeStart}–{rangeEnd} sur {totalItems}
      </p>
      <div className="flex w-full items-center justify-center gap-2 md:w-auto">
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
