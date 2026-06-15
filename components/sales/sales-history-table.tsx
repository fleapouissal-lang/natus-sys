"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPaymentMethod } from "@/lib/utils";
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
}: {
  sales: Sale[];
  showStore?: boolean;
  showCashier?: boolean;
  onViewSale: (sale: Sale) => void;
}) {
  const colSpan = 5 + (showStore ? 1 : 0) + (showCashier ? 1 : 0);

  return (
    <div className="overflow-x-auto scrollbar-natus max-h-[560px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-primary-light/80 backdrop-blur-sm">
          <tr className="border-y border-border">
            <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
            {showStore && (
              <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
            )}
            {showCashier && (
              <th className="px-6 py-3 text-left font-medium text-muted">Caissier</th>
            )}
            <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
            <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
            <th className="px-6 py-3 text-left font-medium text-muted">Réf.</th>
            <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b border-border">
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
                {formatCurrency(Number(sale.total))}
              </td>
              <td className="px-6 py-4">
                <Badge>{sale.id.slice(0, 8)}</Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end">
                  <SaleViewButton onClick={() => onViewSale(sale)} />
                </div>
              </td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-6 py-12 text-center text-muted">
                Aucune vente pour ces filtres
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { PaymentMethod };
