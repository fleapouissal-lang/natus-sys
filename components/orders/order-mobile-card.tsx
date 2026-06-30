"use client";

import {
  Eye,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  RotateCcw,
} from "lucide-react";
import { OrderDeliveredLivreur } from "@/components/orders/order-delivered-livreur";
import { OrderDeliveryRoute } from "@/components/orders/order-delivery-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderAgeBadge } from "@/components/orders/order-age-badge";
import { orderCreatedAt } from "@/lib/shopify/order-age-urgency";
import {
  paymentTypeLabel,
  workflowStatusLabel,
} from "@/lib/shopify/order-status";
import { confirmationFollowUpBadge } from "@/lib/shopify/confirmation-follow-up";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ShopifyOrder } from "@/lib/types";

export function OrderMobileCard({
  order,
  loading,
  showStore = false,
  livreurMode = false,
  canLivreurClose = false,
  onDeliver,
  onReturn,
  onView,
  onCallFollowUp,
  showCallFollowUp = false,
  callOverdue = false,
  deliveredLivreurName = null,
}: {
  order: ShopifyOrder;
  loading?: boolean;
  showStore?: boolean;
  livreurMode?: boolean;
  canLivreurClose?: boolean;
  onDeliver?: () => void;
  onReturn?: () => void;
  onView?: () => void;
  onCallFollowUp?: () => void;
  showCallFollowUp?: boolean;
  callOverdue?: boolean;
  deliveredLivreurName?: string | null;
}) {
  const isCod = order.payment_type === "cod";
  const followUpBadge = confirmationFollowUpBadge(order);
  const storeName = (order.stores as { name: string } | null)?.name;

  return (
    <article className="natus-mobile-order-card overflow-hidden rounded-2xl border border-primary/25 bg-surface shadow-[0_4px_20px_rgba(179,140,74,0.08)]">
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 bg-champagne/25 px-4 py-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold text-primary">{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted">
            {order.shopify_created_at
              ? formatDate(order.shopify_created_at)
              : formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="font-heading text-xl font-bold">{formatCurrency(order.total)}</p>
          <OrderAgeBadge createdAt={orderCreatedAt(order)} />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{order.customer_name || "Client inconnu"}</p>
          {order.customer_phone ? (
            <a
              href={`tel:${order.customer_phone}`}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Phone className="h-3 w-3" />
              {order.customer_phone}
            </a>
          ) : null}
        </div>

        {livreurMode ? (
          <OrderDeliveryRoute order={order} />
        ) : order.shipping_address ? (
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2">{order.shipping_address}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={isCod ? "warning" : "success"}>{paymentTypeLabel(order.payment_type)}</Badge>
          <Badge variant="default">{workflowStatusLabel(order.workflow_status)}</Badge>
          {showStore && !livreurMode && storeName ? (
            <Badge variant="accent">{storeName}</Badge>
          ) : null}
          {followUpBadge ? (
            <Badge variant={followUpBadge.variant} className="text-[10px]">
              {followUpBadge.label}
            </Badge>
          ) : null}
        </div>

        <OrderDeliveredLivreur name={deliveredLivreurName} />

        {livreurMode && canLivreurClose ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" size="sm" disabled={loading} onClick={onDeliver} className="h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Livré
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={onReturn}
              className="h-11"
            >
              <RotateCcw className="h-4 w-4" />
              Retour
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {showCallFollowUp && onCallFollowUp ? (
              <Button
                type="button"
                size="sm"
                variant={callOverdue ? "danger" : "secondary"}
                disabled={loading}
                onClick={onCallFollowUp}
              >
                <Phone className="h-3.5 w-3.5" />
                Appeler
              </Button>
            ) : null}
            {onView ? (
              <Button type="button" size="sm" variant="secondary" onClick={onView} disabled={loading}>
                <Eye className="h-3.5 w-3.5" />
                Détails
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
