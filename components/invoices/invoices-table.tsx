"use client";

import Link from "next/link";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Button } from "@/components/ui/button";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import { saleInvoiceCustomerName } from "@/lib/sales/invoice-customer";
import { downloadInvoiceHtml } from "@/lib/sales/download-invoice";
import { saleToDocumentData } from "@/lib/sales/sale-to-document";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";

function downloadInvoiceFromSale(sale: InvoiceSale) {
  downloadInvoiceHtml(saleToDocumentData(sale));
}

export function InvoicesTable({
  sales,
  detailBasePath,
  showStore = false,
  showCashier = false,
  canValidateInvoices = false,
  validatingId,
  onValidate,
  paginationKey,
}: {
  sales: InvoiceSale[];
  detailBasePath: string;
  showStore?: boolean;
  showCashier?: boolean;
  canValidateInvoices?: boolean;
  validatingId?: string | null;
  onValidate?: (saleId: string) => void;
  paginationKey?: string;
}) {
  const colSpan =
    6 + (showStore ? 1 : 0) + (showCashier ? 1 : 0) + (canValidateInvoices ? 1 : 0);
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(sales, DEFAULT_PAGE_SIZE, paginationKey);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-primary-light/50">
              <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
              <th className="px-6 py-3 text-left font-medium text-muted">N° facture</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
              {showStore && (
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
              )}
              {showCashier && (
                <th className="px-6 py-3 text-left font-medium text-muted">Caissier</th>
              )}
              {canValidateInvoices && (
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
              )}
              <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((sale) => {
              const href = `${detailBasePath}/${sale.id}`;
              const cancelled = Boolean(sale.cancelled_at);
              const validated = isSaleInvoiceValidated(sale);

              return (
                <tr
                  key={sale.id}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-primary-light/30",
                    cancelled && "opacity-60"
                  )}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={href} className="block font-medium hover:underline">
                      {formatDate(sale.created_at)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={href} className="hover:underline">
                      {saleDocumentNumber(sale.id)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={sale.shopify_order_id ? "accent" : "default"}>
                      {invoiceTypeLabel(sale)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">{saleInvoiceCustomerName(sale)}</td>
                  {showStore && (
                    <td className="px-6 py-4 text-muted">
                      {sale.stores?.name || "—"}
                    </td>
                  )}
                  {showCashier && (
                    <td className="px-6 py-4 text-muted">
                      {sale.profiles?.full_name || sale.profiles?.email || "—"}
                    </td>
                  )}
                  {canValidateInvoices && (
                    <td className="px-6 py-4">
                      <Badge variant={validated ? "success" : "warning"}>
                        {validated ? "Validée" : "En attente"}
                      </Badge>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right font-semibold tabular-nums">
                    {formatCurrency(Number(sale.total))}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {canValidateInvoices && !validated && onValidate && (
                        <Button
                          type="button"
                          size="sm"
                          loading={validatingId === sale.id}
                          onClick={() => onValidate(sale.id)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Valider
                        </Button>
                      )}
                      {validated && (
                        <button
                          type="button"
                          onClick={() => downloadInvoiceFromSale(sale)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        href={href}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Voir la facture"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-10 text-center text-muted">
                  Aucune facture
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        onPageChange={setPage}
        className="border-t border-border px-6 py-4"
      />
    </>
  );
}
