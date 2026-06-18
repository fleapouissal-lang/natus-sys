"use client";

import { useState, useTransition } from "react";
import { X, Store, User, CreditCard, Banknote, Ban } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelSale } from "@/lib/actions";
import { formatCurrency, formatDate, formatPaymentMethod } from "@/lib/utils";
import type { Sale } from "@/lib/types";

function paymentVariant(method: string): "default" | "success" | "accent" {
  return method === "card" ? "accent" : "success";
}

function lineSubtotal(sale: Sale): number {
  return (sale.sale_items || []).reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0
  );
}

export function SaleDetailModal({
  sale,
  onClose,
  onCancelled,
  canCancel = false,
}: {
  sale: Sale;
  onClose: () => void;
  onCancelled?: () => void;
  canCancel?: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const items = sale.sale_items || [];
  const cashierName = sale.profiles?.full_name || sale.profiles?.email || "—";
  const subtotal = lineSubtotal(sale);
  const loyaltyDiscount = Number(sale.loyalty_discount || 0);
  const promoDiscount = Number(sale.promo_discount || 0);
  const isCancelled = Boolean(sale.cancelled_at);

  function handleCancel() {
    if (!confirm("Annuler cette vente et remettre les produits en stock ?")) return;

    setError("");
    startTransition(async () => {
      const result = await cancelSale(sale.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCancelled?.();
      onClose();
    });
  }

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
        {isCancelled && <Badge variant="danger">Annulée</Badge>}
        {sale.promo_code && !isCancelled && (
          <Badge variant="accent">Promo {sale.promo_code}</Badge>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {sale.stores?.name && (
          <div className="flex items-start gap-2 text-sm">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{sale.stores.name}</p>
              {sale.stores.city && <p className="text-muted">{sale.stores.city}</p>}
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted">Caissier</p>
            <p className="font-medium">{cashierName}</p>
            {sale.customers?.full_name && (
              <p className="mt-1 text-xs text-muted">
                Client : {sale.customers.full_name}
                {sale.customers.card_number ? ` · ${sale.customers.card_number}` : ""}
              </p>
            )}
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
                    <p className="font-medium">{item.products?.name || "Produit"}</p>
                    {item.products?.barcode && (
                      <p className="font-mono text-xs text-muted">{item.products.barcode}</p>
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
            {subtotal > 0 && (loyaltyDiscount > 0 || promoDiscount > 0) && (
              <tr className="border-t border-border">
                <td colSpan={3} className="px-4 py-2 text-right text-muted">
                  Sous-total
                </td>
                <td className="px-4 py-2 text-right">{formatCurrency(subtotal)}</td>
              </tr>
            )}
            {loyaltyDiscount > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-success">
                  Points fidélité
                  {sale.loyalty_points_redeemed
                    ? ` (${sale.loyalty_points_redeemed} pts)`
                    : ""}
                </td>
                <td className="px-4 py-2 text-right text-success">
                  -{formatCurrency(loyaltyDiscount)}
                </td>
              </tr>
            )}
            {promoDiscount > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-success">
                  Code promo {sale.promo_code}
                </td>
                <td className="px-4 py-2 text-right text-success">
                  -{formatCurrency(promoDiscount)}
                </td>
              </tr>
            )}
            {sale.loyalty_points_earned > 0 && !isCancelled && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-muted">
                  Points gagnés
                </td>
                <td className="px-4 py-2 text-right text-success">
                  +{sale.loyalty_points_earned} pts
                </td>
              </tr>
            )}
            <tr className="bg-primary-light/30">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                {isCancelled ? "Total (annulée)" : "Total TTC"}
              </td>
              <td className="px-4 py-3 text-right text-base font-bold">
                {formatCurrency(Number(sale.total))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isCancelled && sale.cancelled_at && (
        <p className="mt-3 text-sm text-danger">
          Annulée le {formatDate(sale.cancelled_at)}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {canCancel && !isCancelled && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={handleCancel}
            className="gap-1.5"
          >
            <Ban className="h-4 w-4" />
            Annuler la vente
          </Button>
        </div>
      )}
    </Modal>
  );
}
