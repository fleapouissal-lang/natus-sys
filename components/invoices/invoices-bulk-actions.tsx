"use client";

import { useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadInvoicesHtml,
  printInvoicesCombinedHtml,
} from "@/lib/sales/download-invoice";
import { invoicesToDocumentData } from "@/lib/sales/export-invoices";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import { formatCurrency } from "@/lib/utils";

export function InvoicesBulkActions({
  selectedSales,
  scopeLabel,
  onClearSelection,
}: {
  selectedSales: InvoiceSale[];
  scopeLabel: string;
  onClearSelection: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  if (selectedSales.length === 0) return null;

  const total = selectedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const documentData = invoicesToDocumentData(selectedSales);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadInvoicesHtml(documentData);
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
          {selectedSales.length} facture{selectedSales.length > 1 ? "s" : ""} sélectionnée
          {selectedSales.length > 1 ? "s" : ""}
        </p>
        <p className="text-sm text-muted">
          Total TTC : <span className="font-medium text-foreground">{formatCurrency(total)}</span>
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
          {selectedSales.length === 1 ? "Télécharger" : `Télécharger (${selectedSales.length})`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          onClick={() => printInvoicesCombinedHtml(documentData, { scopeLabel })}
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onClearSelection}>
          <X className="h-4 w-4" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
