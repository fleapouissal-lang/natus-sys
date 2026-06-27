import {
  A4_PAGE_RULES_FOR_INJECT,
  TICKET_PAGE_RULES_FOR_INJECT,
} from "@/lib/print/document-styles";

const PAGE_STYLE_ID = "natus-print-page-size";

export type PrintPageLayout = "a4" | "a4-report" | "ticket";

const PAGE_RULES: Record<PrintPageLayout, string> = {
  a4: A4_PAGE_RULES_FOR_INJECT,
  "a4-report": A4_PAGE_RULES_FOR_INJECT,
  ticket: TICKET_PAGE_RULES_FOR_INJECT,
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
