import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import { saleInvoiceCustomerName } from "@/lib/sales/invoice-customer";
import { saleToDocumentData, type InvoiceSale } from "@/lib/sales/sale-to-document";
import { paymentMethodLabel } from "@/lib/constants/sales";
import { formatCurrency, formatDate, toLocalDateKey } from "@/lib/utils";

export function isInvoiceExportable(sale: InvoiceSale): boolean {
  return !sale.cancelled_at && isSaleInvoiceValidated(sale);
}

export function getExportableInvoices(sales: InvoiceSale[]): InvoiceSale[] {
  return sales.filter(isInvoiceExportable);
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function downloadInvoicesCsv(
  sales: InvoiceSale[],
  options: {
    scopeLabel: string;
    showStore?: boolean;
    showCashier?: boolean;
  }
): void {
  if (sales.length === 0) return;

  const headers = [
    "N° facture",
    "Date",
    "Type",
    "Client",
    ...(options.showStore ? ["Magasin", "Ville"] : []),
    ...(options.showCashier ? ["Caissier"] : []),
    "Paiement",
    "Montant TTC",
  ];

  const rows = sales.map((sale) => {
    const cells = [
      saleDocumentNumber(sale.id, sale.invoice_number),
      formatDate(sale.created_at),
      invoiceTypeLabel(sale),
      saleInvoiceCustomerName(sale),
      ...(options.showStore
        ? [sale.stores?.name || "—", sale.stores?.city || "—"]
        : []),
      ...(options.showCashier
        ? [sale.profiles?.full_name || sale.profiles?.email || "—"]
        : []),
      paymentMethodLabel(sale.payment_method),
      Number(sale.total).toFixed(2),
    ];
    return cells.map(csvCell).join(",");
  });

  const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const summaryRow = [
    "",
    "",
    "",
    `TOTAL (${sales.length} facture${sales.length > 1 ? "s" : ""})`,
    ...(options.showStore ? ["", ""] : []),
    ...(options.showCashier ? [""] : []),
    "",
    total.toFixed(2),
  ]
    .map(csvCell)
    .join(",");

  const metaLines = [
    `# Export factures — ${options.scopeLabel}`,
    `# Généré le ${new Date().toLocaleString("fr-FR")}`,
    "",
  ];

  const csv = [...metaLines, headers.join(","), ...rows, summaryRow].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `factures-${toLocalDateKey(new Date())}-${sales.length}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function invoicesToDocumentData(sales: InvoiceSale[]) {
  return sales.map((sale) => saleToDocumentData(sale));
}
