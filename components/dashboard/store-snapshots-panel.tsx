"use client";

import { MapPin, Package, ShoppingBag, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import {
  paymentTypeLabel,
  workflowStatusLabel,
} from "@/lib/shopify/order-status";
import { formatCurrency, formatDate, formatPaymentMethod } from "@/lib/utils";
import type { StoreOverviewRow, StoreSnapshot } from "@/lib/types";

function MiniList<T>({
  title,
  icon: Icon,
  emptyLabel,
  items,
  renderItem,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="border border-border bg-background/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function StoreSnapshotCard({
  snapshot,
  overview,
}: {
  snapshot: StoreSnapshot;
  overview?: StoreOverviewRow;
}) {
  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-primary/15 bg-primary/8 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">{snapshot.storeName}</h3>
              {overview && (
                <p className="mt-1 text-xs text-muted">
                  {overview.todaySales} vente{overview.todaySales !== 1 ? "s" : ""} aujourd&apos;hui
                  {" · "}
                  {formatCurrency(overview.todayRevenue)}
                  {" · "}
                  {overview.lowStockCount} alerte{overview.lowStockCount !== 1 ? "s" : ""} stock
                </p>
              )}
            </div>
          </div>
          {overview && (
            <Badge variant={overview.lowStockCount > 0 ? "warning" : "success"}>
              {overview.totalUnits} unités
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <MiniList
          title="5 dernières ventes"
          icon={ShoppingBag}
          emptyLabel="Aucune vente récente"
          items={snapshot.recentSales}
          renderItem={(sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{formatCurrency(sale.total)}</p>
                <p className="truncate text-xs text-muted">
                  {sale.cashier_name || "Caissier"} ·{" "}
                  {formatPaymentMethod(sale.payment_method)}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-muted">
                {formatDate(sale.created_at)}
              </p>
            </div>
          )}
        />

        <MiniList
          title="5 dernières commandes"
          icon={ShoppingCart}
          emptyLabel="Aucune commande récente"
          items={snapshot.recentOrders}
          renderItem={(order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{order.order_number}</p>
                <p className="truncate text-xs text-muted">
                  {order.customer_name || "Client"} ·{" "}
                  {paymentTypeLabel(order.payment_type)}
                </p>
                <Badge className="mt-1 text-[10px]">
                  {workflowStatusLabel(order.workflow_status)}
                </Badge>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                <p className="text-[11px] text-muted">{formatDate(order.created_at)}</p>
              </div>
            </div>
          )}
        />

        <MiniList
          title="5 dernières actions stock"
          icon={Package}
          emptyLabel="Aucune action stock récente"
          items={snapshot.recentStockAdds}
          renderItem={(item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted">
                  {item.action_label}
                  {item.quantity > 0 ? ` +${item.quantity}` : ` ${item.quantity}`}
                  {item.related_store_name ? ` · ${item.related_store_name}` : ""}
                  {" · "}
                  {item.actor_name || "Utilisateur"}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-muted">
                {formatDate(item.created_at)}
              </p>
            </div>
          )}
        />
      </div>
    </Card>
  );
}

export function StoreSnapshotsPanel({
  snapshots,
  overviewByStore,
}: {
  snapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
}) {
  if (snapshots.length === 0) return null;

  return (
    <div className="space-y-4">
      <CardHeader
        title="Vue générale par magasin"
        description="Activité récente — ventes, commandes et actions stock (ajouts, ajustements, transferts hub)"
      />

      <div className="space-y-4">
        {snapshots.map((snapshot) => (
          <StoreSnapshotCard
            key={snapshot.storeId}
            snapshot={snapshot}
            overview={overviewByStore[snapshot.storeId]}
          />
        ))}
      </div>
    </div>
  );
}
