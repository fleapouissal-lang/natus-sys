"use client";

import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Store,
  CreditCard,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  workflowStatusLabel,
  paymentTypeLabel,
} from "@/lib/shopify/order-status";
import type { ShopifyOrder } from "@/lib/types";

function statusVariant(
  status: string | null
): "default" | "success" | "warning" | "danger" {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "paid" || s === "fulfilled" || s === "delivered") return "success";
  if (s === "cancelled" || s === "refunded" || s === "returned") return "danger";
  if (
    s === "pending" ||
    s === "preparing" ||
    s === "ready" ||
    s === "shipping" ||
    s === "unfulfilled"
  )
    return "warning";
  return "default";
}

export function ShopifyOrderDetailModal({
  order,
  onClose,
}: {
  order: ShopifyOrder;
  onClose: () => void;
}) {
  const isCod = order.payment_type === "cod";
  const storeName = (order.stores as { name: string } | null)?.name;

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Commande {order.order_number}</h3>
          <p className="mt-1 text-sm text-muted">
            {order.shopify_created_at
              ? formatDate(order.shopify_created_at)
              : formatDate(order.created_at)}
          </p>
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
        <Badge variant={isCod ? "warning" : "success"}>
          {paymentTypeLabel(order.payment_type)}
        </Badge>
        <Badge variant={statusVariant(order.workflow_status)}>
          {workflowStatusLabel(order.workflow_status)}
        </Badge>
        {order.sale_id && <Badge variant="success">Encaissée en caisse</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-border bg-primary-light/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-primary" />
            Client
          </h4>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted">Nom</dt>
              <dd className="font-medium">{order.customer_name || "—"}</dd>
            </div>
            {order.customer_email && (
              <div>
                <dt className="flex items-center gap-1 text-muted">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </dt>
                <dd>{order.customer_email}</dd>
              </div>
            )}
            {order.customer_phone && (
              <div>
                <dt className="flex items-center gap-1 text-muted">
                  <Phone className="h-3.5 w-3.5" />
                  Téléphone
                </dt>
                <dd>{order.customer_phone}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-primary-light/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            Livraison
          </h4>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted">Adresse</dt>
              <dd className="font-medium">{order.shipping_address || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Ville</dt>
              <dd>{order.city}</dd>
            </div>
            {storeName && (
              <div>
                <dt className="flex items-center gap-1 text-muted">
                  <Store className="h-3.5 w-3.5" />
                  Magasin assigné
                </dt>
                <dd>{storeName}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-border p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4 text-primary" />
          Produits ({order.line_items.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4 font-medium">Produit</th>
                <th className="pb-2 pr-4 font-medium">SKU</th>
                <th className="pb-2 pr-4 text-center font-medium">Qté</th>
                <th className="pb-2 pr-4 text-right font-medium">P.U.</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.line_items.map((item) => {
                const unit = parseFloat(item.price) || 0;
                const lineTotal = unit * item.quantity;
                return (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{item.title}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                      {item.sku || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-center">{item.quantity}</td>
                    <td className="py-2.5 pr-4 text-right">{formatCurrency(unit)}</td>
                    <td className="py-2.5 text-right font-medium">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-3 text-right font-semibold">
                  Total commande
                </td>
                <td className="pt-3 text-right text-lg font-bold text-primary">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {order.payment_gateway && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <CreditCard className="h-3.5 w-3.5" />
          Passerelle : {order.payment_gateway}
        </p>
      )}

      <div className="mt-6">
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
