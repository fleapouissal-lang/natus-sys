"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";

export function ClosureReportsBulkActions({
  selectedClosures,
  onDownload,
  onClearSelection,
}: {
  selectedClosures: StoreDayClosureReportRow[];
  onDownload: () => Promise<void>;
  onClearSelection: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  if (selectedClosures.length === 0) return null;

  const totalCa = selectedClosures.reduce((sum, closure) => sum + closure.stats.total, 0);

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/35 bg-champagne px-4 py-3 shadow-md"
    >
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {selectedClosures.length} rapport{selectedClosures.length > 1 ? "s" : ""} sélectionné
          {selectedClosures.length > 1 ? "s" : ""}
        </p>
        <p className="text-sm text-muted">
          Total CA : <span className="font-medium text-foreground">{formatCurrency(totalCa)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-champagne text-black hover:opacity-90"
          loading={downloading}
          onClick={() => void handleDownload()}
        >
          <Download className="h-4 w-4" />
          {selectedClosures.length === 1
            ? "Télécharger"
            : `Télécharger (${selectedClosures.length})`}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onClearSelection}>
          <X className="h-4 w-4" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
