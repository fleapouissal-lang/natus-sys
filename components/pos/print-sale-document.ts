export type SalePrintTarget = "ticket" | "invoice";

const PAGE_STYLE_ID = "natus-print-page-size";

function setPrintPageSize(target: SalePrintTarget) {
  let el = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PAGE_STYLE_ID;
    document.head.appendChild(el);
  }

  el.textContent =
    target === "invoice"
      ? "@media print { @page { size: A4 portrait; margin: 18mm 14mm 14mm 14mm; } }"
      : "@media print { @page { size: 80mm auto; margin: 4mm; } }";
}

export function printSaleDocument(target: SalePrintTarget) {
  setPrintPageSize(target);
  document.body.dataset.printDoc = target;
  window.print();
  window.requestAnimationFrame(() => {
    delete document.body.dataset.printDoc;
  });
}
