const PAGE_STYLE_ID = "natus-print-page-size";

export type PrintPageLayout = "a4" | "a4-report" | "ticket";

const PAGE_RULES: Record<PrintPageLayout, string> = {
  a4: `@media print {
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 18mm 10mm;
      @bottom-center {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #000;
        font-family: system-ui, sans-serif;
      }
    }
  }`,
  "a4-report": `@media print {
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 18mm 10mm;
      @bottom-center {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #000;
        font-family: system-ui, sans-serif;
      }
    }
  }`,
  ticket: `@media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    html, body {
      width: 80mm !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
  }`,
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
