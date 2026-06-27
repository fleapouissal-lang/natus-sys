import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { printInvoiceHtml } from "@/lib/sales/download-invoice";
import {
  runAfterPrintLayout,
  setPrintPageLayout,
  type PrintPageLayout,
} from "@/lib/print/page-size";

export type SalePrintTarget = "ticket" | "invoice";

const TARGET_LAYOUT: Record<Exclude<SalePrintTarget, "invoice">, PrintPageLayout> = {
  ticket: "ticket",
};

export function printSaleDocument(target: "ticket"): void;
export function printSaleDocument(target: "invoice", data: SaleDocumentData): void;
export function printSaleDocument(
  target: SalePrintTarget,
  invoiceData?: SaleDocumentData
) {
  if (target === "invoice") {
    if (invoiceData) {
      printInvoiceHtml(invoiceData);
    }
    return;
  }

  setPrintPageLayout(TARGET_LAYOUT[target]);
  document.body.dataset.printDoc = target;
  runAfterPrintLayout(() => {
    window.print();
    window.requestAnimationFrame(() => {
      delete document.body.dataset.printDoc;
    });
  });
}
