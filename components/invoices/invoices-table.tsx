"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileText, ShieldCheck, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Button } from "@/components/ui/button";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { invoiceTypeLabel } from "@/lib/sales/fetch-invoices";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import {
  saleInvoiceClientProfile,
  saleInvoiceClientProfileLabel,
  saleInvoiceCustomerName,
} from "@/lib/sales/invoice-customer";
import { downloadInvoiceHtml } from "@/lib/sales/download-invoice";
import { isInvoiceExportable } from "@/lib/sales/export-invoices";
import { saleToDocumentData } from "@/lib/sales/sale-to-document";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import { InvoiceCustomerEditModal } from "@/components/invoices/invoice-customer-edit-form";

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
  selectedIds,
  onToggleSale,
  onTogglePage,
  showPagination = true,
}: {
  sales: InvoiceSale[];
  detailBasePath: string;
  showStore?: boolean;
  showCashier?: boolean;
  canValidateInvoices?: boolean;
  validatingId?: string | null;
  onValidate?: (saleId: string) => void;
  paginationKey?: string;
  selectedIds: string[];
  onToggleSale: (saleId: string) => void;
  onTogglePage: (saleIds: string[], selected: boolean) => void;
  showPagination?: boolean;
}) {
  const [editingSale, setEditingSale] = useState<InvoiceSale | null>(null);
  const colSpan =
    8 + (showStore ? 1 : 0) + (showCashier ? 1 : 0) + (canValidateInvoices ? 1 : 0);

  function clientProfileBadgeVariant(
    profile: ReturnType<typeof saleInvoiceClientProfile>
  ): "default" | "success" | "accent" {
    if (profile === "pro") return "accent";
    if (profile === "fidele") return "success";
    return "default";
  }
  const pagination = usePagination(
    sales,
    DEFAULT_PAGE_SIZE,
    showPagination ? paginationKey : "__static__"
  );
  const rows = showPagination ? pagination.paginated : sales;

  const exportableOnPage = rows.filter(isInvoiceExportable);
  const exportableIdsOnPage = exportableOnPage.map((sale) => sale.id);
  const allPageSelected =
    exportableIdsOnPage.length > 0 &&
    exportableIdsOnPage.every((id) => selectedIds.includes(id));
  const somePageSelected =
    exportableIdsOnPage.some((id) => selectedIds.includes(id)) && !allPageSelected;

  return (
    <>
      {editingSale && (
        <InvoiceCustomerEditModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => setEditingSale(null)}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-primary-light/50">
              <th className="sticky left-0 z-[1] w-11 bg-primary-light/50 px-3 py-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allPageSelected ? true : somePageSelected ? "mixed" : false}
                  aria-label="Sélectionner la page"
                  title="Sélectionner les factures exportables de cette page"
                  disabled={exportableIdsOnPage.length === 0}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onTogglePage(exportableIdsOnPage, !allPageSelected);
                  }}
                  className={cn(
                    "natus-invoice-select flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    exportableIdsOnPage.length === 0
                      ? "cursor-not-allowed border-border/60 bg-white opacity-40"
                      : "cursor-pointer border-primary/50 bg-white hover:border-primary",
                    allPageSelected && "border-primary bg-primary text-white",
                    somePageSelected &&
                      !allPageSelected &&
                      "border-primary bg-primary/20 text-primary"
                  )}
                >
                  {allPageSelected ? (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                      <path
                        d="M2 6l3 3 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : somePageSelected ? (
                    <span className="block h-0.5 w-2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>
              </th>
              <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
              <th className="px-6 py-3 text-left font-medium text-muted">N° facture</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Type</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Profil</th>
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
            {rows.map((sale) => {
              const href = `${detailBasePath}/${sale.id}`;
              const cancelled = Boolean(sale.cancelled_at);
              const validated = isSaleInvoiceValidated(sale);
              const exportable = isInvoiceExportable(sale);
              const selected = selectedIds.includes(sale.id);

              function handleRowSelect() {
                if (!exportable) return;
                onToggleSale(sale.id);
              }

              return (
                <tr
                  key={sale.id}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-primary-light/30",
                    cancelled && "opacity-60",
                    selected && "bg-primary-light/40"
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-[1] px-3 py-4",
                      selected ? "bg-primary-light/40" : "bg-surface"
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={`Sélectionner ${saleDocumentNumber(sale.id)}`}
                      disabled={!exportable}
                      title={
                        exportable
                          ? "Inclure dans l'export"
                          : validated
                            ? "Facture annulée"
                            : "Facture non validée — non exportable"
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRowSelect();
                      }}
                      className={cn(
                        "natus-invoice-select flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        exportable
                          ? "cursor-pointer border-primary/50 hover:border-primary"
                          : "cursor-not-allowed border-border/60 opacity-40",
                        selected
                          ? "border-primary bg-primary text-white"
                          : "bg-white text-transparent"
                      )}
                    >
                      {selected ? (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                          <path
                            d="M2 6l3 3 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>
                  </td>
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
                  <td className="px-6 py-4">
                    <Badge variant={clientProfileBadgeVariant(saleInvoiceClientProfile(sale))}>
                      {saleInvoiceClientProfileLabel(sale)}
                    </Badge>
                  </td>
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
                      {canValidateInvoices && !validated && !cancelled && (
                        <button
                          type="button"
                          onClick={() => setEditingSale(sale)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Modifier le client"
                        >
                          <UserPen className="h-4 w-4" />
                        </button>
                      )}
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
                      {exportable && (
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-10 text-center text-muted">
                  Aucune facture
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          totalItems={pagination.totalItems}
          onPageChange={pagination.setPage}
          className="border-t border-border px-6 py-4"
        />
      )}
    </>
  );
}
