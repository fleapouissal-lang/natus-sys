"use client";

import { useState } from "react";
import { ArrowLeft, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PosInvoice } from "@/components/pos/pos-invoice";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/sales";
import type { CustomerSaleDetail, CustomerSaleSummary } from "@/lib/loyalty/customer-sales";
import { customerOrderToDocumentData } from "@/lib/loyalty/customer-sales";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

function EmptyOrders() {
  return (
    <div className="px-6 py-12 text-center">
      <Receipt className="mx-auto h-8 w-8 text-muted" />
      <p className="mt-3 text-sm font-medium text-foreground">Aucune vente</p>
      <p className="mt-1 text-xs text-muted">
        Les achats passés avec ce compte Client Pro apparaîtront ici.
      </p>
    </div>
  );
}

export function LoyaltyCustomerSalesSection({
  sales,
  title = "Commandes",
  description = "Toutes les ventes enregistrées avec ce compte Client Pro",
  compact = false,
}: {
  sales: CustomerSaleSummary[];
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "rounded-2xl border border-border bg-surface shadow-sm"}>
      {!compact && (
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
      )}

      {sales.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary-light/30">
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Référence</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const cancelled = Boolean(sale.cancelled_at);
                const validated = Boolean(sale.invoice_validated_at);
                return (
                  <tr key={sale.id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {saleDocumentNumber(sale.id)}
                    </td>
                    <td className="px-6 py-4">{sale.store_name || "—"}</td>
                    <td className="px-6 py-4">
                      {PAYMENT_METHOD_LABELS[
                        sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS
                      ] || sale.payment_method}
                    </td>
                    <td className="px-6 py-4">
                      {cancelled ? (
                        <Badge variant="danger">Annulée</Badge>
                      ) : validated ? (
                        <Badge variant="success">Validée</Badge>
                      ) : (
                        <Badge variant="warning">En cours</Badge>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 text-right font-bold tabular-nums",
                        cancelled && "text-muted line-through"
                      )}
                    >
                      {formatCurrency(Number(sale.total))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function LoyaltyCustomerPortalOrdersList({
  orders,
  loading,
  qrToken,
  selectedOrder,
  onSelectOrder,
  onBack,
}: {
  orders: CustomerSaleSummary[];
  loading: boolean;
  qrToken: string;
  selectedOrder: CustomerSaleDetail | null;
  onSelectOrder: (order: CustomerSaleDetail | null) => void;
  onBack: () => void;
}) {
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function openOrder(saleId: string) {
    onSelectOrder(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/loyalty/card/${qrToken}/commande/${saleId}`);
      if (!res.ok) return;
      const data = await res.json();
      onSelectOrder(data.order);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (selectedOrder) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;historique
        </Button>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <PosInvoice data={customerOrderToDocumentData(selectedOrder)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Historique des achats</h2>
          <p className="mt-0.5 text-xs text-muted">
            Tous vos achats en magasin avec ce compte Client Pro
          </p>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-page" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => {
              const cancelled = Boolean(order.cancelled_at);
              const validated = Boolean(order.invoice_validated_at);
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    disabled={cancelled || loadingDetail}
                    onClick={() => void openOrder(order.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
                      cancelled ? "cursor-not-allowed opacity-50" : "hover:bg-primary/5"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Achat {saleDocumentNumber(order.id)}
                        {cancelled && (
                          <span className="ml-1 text-xs text-danger">· Annulé</span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(order.created_at)}
                        {order.store_name ? ` · ${order.store_name}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {PAYMENT_METHOD_LABELS[
                          order.payment_method as keyof typeof PAYMENT_METHOD_LABELS
                        ] || order.payment_method}
                        {!cancelled && !validated ? " · En cours de validation" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-primary tabular-nums">
                        {formatCurrency(Number(order.total))}
                      </span>
                      {order.pro_client_discount > 0 && (
                        <span className="text-[10px] text-success">
                          Remise Pro -{formatCurrency(order.pro_client_discount)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
