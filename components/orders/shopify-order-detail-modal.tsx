"use client";

import { useRouter } from "next/navigation";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Store,
  CreditCard,
  ShoppingCart,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/pos/product-image";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  workflowStatusLabel,
  paymentTypeLabel,
} from "@/lib/shopify/order-status";
import {
  resolveProductForLineItem,
  type ProductLineLookup,
} from "@/lib/shopify/order-cart";
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
  products = [],
  enablePosCheckout = false,
  posCheckoutPath = "/cashier/pos",
  onClose,
}: {
  order: ShopifyOrder;
  products?: ProductLineLookup[];
  enablePosCheckout?: boolean;
  posCheckoutPath?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isCod = order.payment_type === "cod";
  const storeName = (order.stores as { name: string } | null)?.name;
  const canSendToPos =
    enablePosCheckout &&
    !order.sale_id &&
    order.workflow_status !== "cancelled" &&
    order.workflow_status !== "returned";

  function sendOrderToPos() {
    if (!canSendToPos) return;
    router.push(`${posCheckoutPath}?shopify_order=${order.id}`);
    onClose();
  }

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={isCod ? "warning" : "success"}>
          {paymentTypeLabel(order.payment_type)}
        </Badge>
        <Badge variant={statusVariant(order.workflow_status)}>
          {workflowStatusLabel(order.workflow_status)}
        </Badge>
        {order.sale_id && <Badge variant="success">Encaissée en caisse</Badge>}
        {canSendToPos && (
          <Button type="button" size="sm" onClick={sendOrderToPos} className="ml-auto">
            <ShoppingCart className="h-4 w-4" />
            Envoyer en caisse
          </Button>
        )}
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
        <div className="space-y-3">
          {order.line_items.map((item) => {
            const unit = parseFloat(item.price) || 0;
            const lineTotal = unit * item.quantity;
            const product = resolveProductForLineItem(item, products);
            const displayProduct = product ?? {
              id: String(item.id),
              name: item.title,
              barcode: item.sku || "",
              image_url: null,
              category: null,
              price: unit,
            };

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 border border-border/70 bg-surface p-3"
              >
                <ProductImage product={displayProduct} size="sm" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{item.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {item.sku || "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.quantity} × {formatCurrency(unit)} ={" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(lineTotal)}
                    </span>
                  </p>
                </div>
                {canSendToPos && (
                  <button
                    type="button"
                    onClick={sendOrderToPos}
                    title="Envoyer la commande en caisse"
                    aria-label={`Envoyer ${item.title} en caisse`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/30 bg-champagne/30 text-primary transition-colors hover:bg-champagne/60 cursor-pointer"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">Total commande</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(order.total)}
          </span>
        </div>
      </section>

      {order.payment_gateway && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <CreditCard className="h-3.5 w-3.5" />
          Passerelle : {order.payment_gateway}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {canSendToPos && (
          <Button type="button" onClick={sendOrderToPos}>
            <ShoppingCart className="h-4 w-4" />
            Préparer en caisse
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
