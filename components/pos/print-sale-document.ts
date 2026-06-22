import {
  runAfterPrintLayout,
  setPrintPageLayout,
  type PrintPageLayout,
} from "@/lib/print/page-size";

export type SalePrintTarget = "ticket" | "invoice";

const TARGET_LAYOUT: Record<SalePrintTarget, PrintPageLayout> = {
  invoice: "a4",
  ticket: "ticket",
};

export function printSaleDocument(target: SalePrintTarget) {
  setPrintPageLayout(TARGET_LAYOUT[target]);
  document.body.dataset.printDoc = target;
  runAfterPrintLayout(() => {
    window.print();
    window.requestAnimationFrame(() => {
      delete document.body.dataset.printDoc;
    });
  });
}
