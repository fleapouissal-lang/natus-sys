const PAGE_STYLE_ID = "natus-print-page-size";

export type PrintPageLayout = "a4" | "ticket";

const PAGE_RULES: Record<PrintPageLayout, string> = {
  a4: "@media print { @page { size: A4 portrait; margin: 10mm; } }",
  ticket: "@media print { @page { size: 80mm auto; margin: 4mm; } }",
};

export function setPrintPageLayout(layout: PrintPageLayout) {
  let el = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PAGE_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = PAGE_RULES[layout];
}

export function runAfterPrintLayout(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}
