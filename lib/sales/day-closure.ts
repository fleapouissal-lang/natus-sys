import { runAfterPrintLayout, setPrintPageLayout } from "@/lib/print/page-size";
import type { Sale } from "@/lib/types";
import { toLocalDateKey } from "@/lib/utils";

export type DayClosureStats = {
  count: number;
  total: number;
  cash: number;
  card: number;
  cheque: number;
  cancelledCount: number;
  cancelledTotal: number;
  averageTicket: number;
};

export function todayDateKey(): string {
  return toLocalDateKey(new Date());
}

export function filterSalesForDateKey(sales: Sale[], dateKey: string): Sale[] {
  return sales.filter((sale) => saleBusinessDateKey(sale) === dateKey);
}

export function saleBusinessDateKey(sale: Pick<Sale, "business_date" | "created_at">): string {
  return sale.business_date ?? toLocalDateKey(sale.created_at);
}

export function computeDayClosureStats(sales: Sale[]): DayClosureStats {
  const active = sales.filter((s) => !s.cancelled_at);
  const cancelled = sales.filter((s) => s.cancelled_at);
  const total = active.reduce((sum, s) => sum + Number(s.total), 0);
  const cash = active
    .filter((s) => s.payment_method === "cash")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const card = active
    .filter((s) => s.payment_method === "card")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const cheque = active
    .filter((s) => s.payment_method === "cheque")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const count = active.length;

  return {
    count,
    total,
    cash,
    card,
    cheque,
    cancelledCount: cancelled.length,
    cancelledTotal: cancelled.reduce((sum, s) => sum + Number(s.total), 0),
    averageTicket: count > 0 ? total / count : 0,
  };
}

export function formatDayClosureDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDayClosureDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dayClosureReference(dateKey: string): string {
  return dateKey.replace(/-/g, "");
}

export function uniqueCashierLabels(sales: Sale[]): string[] {
  const labels = new Set<string>();
  for (const sale of sales) {
    const name =
      sale.profiles?.full_name?.trim() ||
      sale.profiles?.email?.trim() ||
      null;
    if (name) labels.add(name);
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "fr"));
}

function runPrintJob(
  layout: "ticket" | "a4" | "a4-report",
  doc: "day-closure" | "day-closure-report"
) {
  setPrintPageLayout(layout);
  document.body.dataset.printDoc = doc;

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

export function printDayClosureTicket() {
  runPrintJob("ticket", "day-closure");
}

export function printDayClosureReport() {
  runPrintJob("a4-report", "day-closure-report");
}

export function formatClosureCodeExpiresAt(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    timeZone: "Africa/Casablanca",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function closureCodeMsRemaining(iso: string): number {
  if (!iso) return 0;
  return Math.max(new Date(iso).getTime() - Date.now(), 0);
}
