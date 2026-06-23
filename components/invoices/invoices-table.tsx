"use client";

import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
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
  paginationKey,
}: {
  sales: InvoiceSale[];
  detailBasePath: string;
  showStore?: boolean;
  showCashier?: boolean;
  paginationKey?: string;
}) {
  const colSpan = 6 + (showStore ? 1 : 0) + (showCashier ? 1 : 0);
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
              <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((sale) => {
              const href = `${detailBasePath}/${sale.id}`;
              const cancelled = Boolean(sale.cancelled_at);

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
                  <td className="px-6 py-4">
                    {saleInvoiceCustomerName(sale)}
                    {cancelled && (
                      <p className="text-xs text-danger">Annulée</p>
                    )}
                  </td>
                  {showStore && (
                    <td className="px-6 py-4">
                      {sale.stores?.name || "—"}
                      {sale.stores?.city && (
                        <p className="text-xs text-muted">{sale.stores.city}</p>
                      )}
                    </td>
                  )}
                  {showCashier && (
                    <td className="px-6 py-4">
                      {sale.profiles?.full_name || sale.profiles?.email || "—"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right font-medium">
                    {cancelled ? (
                      <span className="text-muted line-through">
                        {formatCurrency(Number(sale.total))}
                      </span>
                    ) : (
                      formatCurrency(Number(sale.total))
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => downloadInvoiceFromSale(sale)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline md:hidden"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger
                    </button>
                    <Link
                      href={href}
                      className="hidden items-center gap-1.5 text-sm font-medium text-primary hover:underline md:inline-flex"
                    >
                      <FileText className="h-4 w-4" />
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center text-muted">
                  Aucune facture pour ces filtres
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
      />
    </>
  );
}
