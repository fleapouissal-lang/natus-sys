import { workflowStatusLabel, paymentTypeLabel } from "@/lib/shopify/order-status";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PublicShopifyOrder } from "@/lib/shopify/public-order";
import Link from "next/link";
import { Check } from "lucide-react";

export function ShopifyOrderTrackingView({
  order,
  trackingToken,
  justConfirmed = false,
}: {
  order: PublicShopifyOrder;
  trackingToken?: string;
  justConfirmed?: boolean;
}) {
  const items = order.line_items || [];

  return (
    <div className="mx-auto max-w-lg">
      {justConfirmed && (
        <div className="mb-4 border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Votre commande est confirmée. Merci !
        </div>
      )}
      <div className="border border-primary/30 bg-surface p-6 shadow-sm">
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
          Natus — Suivi commande
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">
          {order.order_number}
        </h1>
        {order.customer_name && (
          <p className="mt-1 text-sm text-muted">Client : {order.customer_name}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium">
            {workflowStatusLabel(order.workflow_status)}
          </span>
          <span className="border border-border bg-page px-2.5 py-1 text-xs font-medium text-muted">
            {paymentTypeLabel(order.payment_type)}
          </span>
          {order.customer_confirmed_at && (
            <span className="border border-success/30 bg-success/5 px-2.5 py-1 text-xs font-medium text-success">
              Confirmée par vous
            </span>
          )}
        </div>

        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Articles</p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span>
                {item.title} × {item.quantity}
              </span>
              <span className="shrink-0 font-medium">
                {formatCurrency(Number(item.price) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="font-medium">Total</span>
          <span className="font-heading text-lg font-bold text-primary">
            {formatCurrency(Number(order.total))}
          </span>
        </div>

        {order.loyalty_points_earned > 0 && (
          <p className="mt-3 text-sm text-muted">
            Points fidélité gagnés : +{order.loyalty_points_earned}
          </p>
        )}

        {order.shipping_address && (
          <p className="mt-4 text-sm text-muted">
            <span className="font-medium text-foreground">Livraison : </span>
            {order.shipping_address}
          </p>
        )}

        <p className="mt-4 text-xs text-muted">
          Dernière mise à jour : {formatDate(order.updated_at)}
        </p>

        {!order.customer_confirmed_at && trackingToken && (
          <Link
            href={`/commande/${trackingToken}/confirmer`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-champagne px-6 py-3 text-base font-medium text-black shadow-sm transition-colors hover:brightness-95"
          >
            <Check className="h-4 w-4" />
            Confirmer ma commande
          </Link>
        )}
      </div>
    </div>
  );
}
