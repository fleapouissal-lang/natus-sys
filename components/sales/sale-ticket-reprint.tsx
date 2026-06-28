"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { Ticket } from "@/components/pos/ticket";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { saleToDocumentData } from "@/lib/sales/sale-to-document";
import type { Sale } from "@/lib/types";

export function useSaleTicketReprint() {
  const [printData, setPrintData] = useState<SaleDocumentData | null>(null);
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);

  const clearPrint = useCallback(() => {
    setPrintData(null);
    setPrintingSaleId(null);
  }, []);

  useEffect(() => {
    if (!printData) return;

    let cancelled = false;
    const runPrint = () => {
      if (cancelled) return;
      printSaleDocument("ticket");
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(runPrint);
    });

    const onAfterPrint = () => {
      if (!cancelled) clearPrint();
    };
    window.addEventListener("afterprint", onAfterPrint);

    const fallback = window.setTimeout(() => {
      if (!cancelled) clearPrint();
    }, 120_000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", onAfterPrint);
      window.clearTimeout(fallback);
    };
  }, [printData, clearPrint]);

  const reprintSale = useCallback((sale: Sale) => {
    if (sale.cancelled_at || printingSaleId) return;
    setPrintingSaleId(sale.id);
    setPrintData(saleToDocumentData(sale));
  }, [printingSaleId]);

  const printPortal =
    printData && typeof document !== "undefined"
      ? createPortal(
          <div className="natus-sale-ticket-print-host" aria-hidden>
            <Ticket data={printData} />
          </div>,
          document.body
        )
      : null;

  return {
    reprintSale,
    printingSaleId,
    printPortal,
  };
}
