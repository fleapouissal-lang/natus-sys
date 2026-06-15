"use client";

import { X, Store, User, CreditCard, Banknote } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPaymentMethod } from "@/lib/utils";
import type { Sale } from "@/lib/types";

function paymentVariant(method: string): "default" | "success" | "accent" {
  return method === "card" ? "accent" : "success";
}

export function SaleDetailModal({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const items = sale.sale_items || [];
  const cashierName =
    sale.profiles?.full_name || sale.profiles?.email || "—";

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Détail de la vente</h3>
          <p className="mt-1 text-sm text-muted">{formatDate(sale.created_at)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={paymentVariant(sale.payment_method)}>
          {sale.payment_method === "card" ? (
            <CreditCard className="mr-1 inline h-3 w-3" />
          ) : (
            <Banknote className="mr-1 inline h-3 w-3" />
          )}
          {formatPaymentMethod(sale.payment_method)}
        </Badge>
        <Badge>{sale.id.slice(0, 8)}</Badge>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {sale.stores?.name && (
          <div className="flex items-start gap-2 text-sm">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{sale.stores.name}</p>
              {sale.stores.city && (
                <p className="text-muted">{sale.stores.city}</p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted">Caissier</p>
            <p className="font-medium">{cashierName}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-primary-light/50">
              <th className="px-4 py-2 text-left font-medium text-muted">Produit</th>
              <th className="px-4 py-2 text-right font-medium text-muted">Qté</th>
              <th className="px-4 py-2 text-right font-medium text-muted">P.U.</th>
              <th className="px-4 py-2 text-right font-medium text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const lineTotal = Number(item.unit_price) * item.quantity;
              return (
                <tr key={item.id} className="border-b border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {item.products?.name || "Produit"}
                    </p>
                    {item.products?.barcode && (
                      <p className="font-mono text-xs text-muted">
                        {item.products.barcode}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(Number(item.unit_price))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Aucun article enregistré
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-primary-light/30">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                Total
              </td>
              <td className="px-4 py-3 text-right text-base font-bold">
                {formatCurrency(Number(sale.total))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}
