import type { OrderDatePreset } from "@/lib/store-tracking-period";
import { runAfterPrintLayout, setPrintPageLayout } from "@/lib/print/page-size";

export function salesReportPrintLabel(preset: OrderDatePreset | "custom"): string {
  switch (preset) {
    case "today":
      return "Imprimer rapport du jour";
    case "month":
      return "Imprimer rapport du mois";
    case "week":
      return "Imprimer rapport de la semaine";
    default:
      return "Imprimer rapport";
  }
}

export function formatSalesReportPeriodLabel(
  dateFrom: string,
  dateTo: string,
  presetLabel: string
): string {
  if (dateFrom && dateTo) {
    if (dateFrom === dateTo) return `Le ${formatFrDate(dateFrom)}`;
    return `Du ${formatFrDate(dateFrom)} au ${formatFrDate(dateTo)}`;
  }
  if (dateFrom) return `À partir du ${formatFrDate(dateFrom)}`;
  if (dateTo) return `Jusqu'au ${formatFrDate(dateTo)}`;
  return presetLabel || "Toutes les ventes";
}

function formatFrDate(isoKey: string): string {
  const [y, m, d] = isoKey.split("-").map(Number);
  if (!y || !m || !d) return isoKey;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function printCashierSalesReport() {
  setPrintPageLayout("a4-report");
  document.body.dataset.printDoc = "sales-report";

  const cleanup = () => {
    delete document.body.dataset.printDoc;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });

  runAfterPrintLayout(() => {
    window.print();
    window.setTimeout(cleanup, 3000);
  });
}
