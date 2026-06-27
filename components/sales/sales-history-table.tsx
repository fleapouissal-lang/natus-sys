"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatCurrency, formatDate, formatPaymentMethod } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import { SaleLineItemsSummary } from "@/components/sales/sale-line-items-summary";
import type { PaymentMethod, Sale } from "@/lib/types";

const ACTION_COLOR = "#B38C4A";

function paymentVariant(method: string): "default" | "success" | "accent" {
  return method === "card" ? "accent" : "success";
}

export function SaleViewButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Voir le détail"
      aria-label="Voir le détail de la vente"
      className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-transparent hover:bg-[#B38C4A]/10"
      style={{ borderColor: ACTION_COLOR, color: ACTION_COLOR }}
    >
      <Eye className="h-3.5 w-3.5" />
    </Button>
  );
}

export function SalesHistoryTable({
  sales,
  showStore = true,
  showCashier = false,
  onViewSale,
  paginationKey,
  showPagination = true,
}: {
  sales: Sale[];
  showStore?: boolean;
  showCashier?: boolean;
  onViewSale: (sale: Sale) => void;
  paginationKey?: string;
  showPagination?: boolean;
}) {
  const colSpan = 6 + (showStore ? 1 : 0) + (showCashier ? 1 : 0);
  const pagination = usePagination(
    sales,
    DEFAULT_PAGE_SIZE,
    showPagination ? paginationKey : undefined
  );
  const rows = showPagination ? pagination.paginated : sales;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-3 pb-4 md:hidden">
        {rows.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-sm text-muted">
            Aucune vente pour ces filtres
          </p>
        ) : (
          rows.map((sale) => (
            <button
              key={sale.id}
              type="button"
              onClick={() => onViewSale(sale)}
              className={cn(
                "natus-card flex h-full min-h-[9.5rem] flex-col !p-3 text-left transition-opacity",
                sale.cancelled_at ? "opacity-60" : undefined
              )}
            >
              <p className="text-[10px] text-muted">{formatDate(sale.created_at)}</p>
              <p
                className={cn(
                  "mt-1 font-heading text-lg font-bold leading-tight text-primary",
                  sale.cancelled_at ? "text-muted line-through" : undefined
                )}
              >
                {formatCurrency(Number(sale.total))}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant={paymentVariant(sale.payment_method)} className="text-[10px]">
                  {formatPaymentMethod(sale.payment_method)}
                </Badge>
                {sale.cancelled_at && (
                  <Badge variant="danger" className="text-[10px]">
                    Annulée
                  </Badge>
                )}
              </div>
              <div className="mt-2 min-h-0 flex-1">
                <SaleLineItemsSummary
                  sale={sale}
                  variant="compact"
                  maxItems={4}
                  className="text-[10px] text-foreground/85"
                />
              </div>
              {showStore && sale.stores?.name && (
                <p className="mt-auto pt-2 text-[10px] text-muted line-clamp-1">
                  {sale.stores.name}
                </p>
              )}
              {showCashier && (
                <p className="mt-auto pt-2 text-[10px] text-muted line-clamp-1">
                  {sale.profiles?.full_name || sale.profiles?.email || "—"}
                </p>
              )}
              <p className="mt-1 text-[10px] font-medium text-muted">
                Réf. {sale.id.slice(0, 8)}
              </p>
            </button>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-primary-light/50">
              <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
              {showStore && (
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
              )}
              {showCashier && (
                <th className="px-6 py-3 text-left font-medium text-muted">Caissier</th>
              )}
              <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Articles</th>
              <th className="px-6 py-3 text-left font-medium text-muted">Réf.</th>
              <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sale) => (
              <tr
                key={sale.id}
                className={cn(
                  "border-b border-border",
                  sale.cancelled_at ? "opacity-60" : undefined
                )}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(sale.created_at)}
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
                <td className="px-6 py-4">
                  <Badge variant={paymentVariant(sale.payment_method)}>
                    {formatPaymentMethod(sale.payment_method)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {sale.cancelled_at ? (
                    <span className="text-muted line-through">
                      {formatCurrency(Number(sale.total))}
                    </span>
                  ) : (
                    formatCurrency(Number(sale.total))
                  )}
                </td>
                <td className="px-6 py-4 align-top">
                  <SaleLineItemsSummary sale={sale} variant="compact" maxItems={6} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge>{sale.id.slice(0, 8)}</Badge>
                    {sale.cancelled_at && <Badge variant="danger">Annulée</Badge>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <SaleViewButton onClick={() => onViewSale(sale)} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center text-muted">
                  Aucune vente pour ces filtres
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && sales.length > 0 && (
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          totalItems={pagination.totalItems}
          onPageChange={pagination.setPage}
        />
      )}
    </>
  );
}

export type { PaymentMethod };
