"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Package, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDate, formatPaymentMethod, cn } from "@/lib/utils";
import type { StoreOverviewRow, StoreSnapshot } from "@/lib/types";

function MiniList<T>({
  title,
  icon: Icon,
  emptyLabel,
  items,
  renderItem,
  mobileCollapsible = false,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  mobileCollapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const content = (
    <>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">{items.map(renderItem)}</div>
      )}
    </>
  );

  if (mobileCollapsible) {
    return (
      <>
        <div className="hidden rounded-xl border border-border bg-background/50 p-3 lg:block">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          {content}
        </div>
        <div className="overflow-hidden rounded-xl border border-primary/15 bg-surface lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-champagne/50">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="text-sm font-semibold">{title}</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-primary transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
          {open ? <div className="border-t border-primary/10 px-4 pb-3">{content}</div> : null}
        </div>
      </>
    );
  }

  return (
    <div className="border border-border bg-background/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {content}
    </div>
  );
}

function StoreSnapshotCard({
  snapshot,
  overview,
  periodLabel,
  displayLimit = 5,
  stockOnly = false,
}: {
  snapshot: StoreSnapshot;
  overview?: StoreOverviewRow;
  periodLabel: string;
  displayLimit?: number;
  stockOnly?: boolean;
}) {
  const periodRevenue = snapshot.recentSales.reduce((s, sale) => s + sale.total, 0);
  const salesShown = snapshot.recentSales.slice(0, displayLimit);
  const stockShown = snapshot.recentStockAdds.slice(0, displayLimit);

  return (
    <Card padding={false} className="overflow-hidden rounded-2xl md:rounded-lg">
      <div className="border-b border-primary/15 bg-champagne/30 px-4 py-4 md:bg-primary/8 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <MapPin className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h3 className="font-heading text-base font-bold md:text-lg">{snapshot.storeName}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted md:text-xs">
                {periodLabel}
                {!stockOnly && (
                  <>
                    {" · "}
                    {snapshot.recentSales.length} vente
                    {snapshot.recentSales.length !== 1 ? "s" : ""}
                    {" · "}
                    {formatCurrency(periodRevenue)}
                  </>
                )}
                {stockOnly && (
                  <>
                    {" · "}
                    {snapshot.recentStockAdds.length} action
                    {snapshot.recentStockAdds.length !== 1 ? "s" : ""} stock
                  </>
                )}
                {overview ? (
                  <>
                    {" · "}
                    {overview.lowStockCount} alerte
                    {overview.lowStockCount !== 1 ? "s" : ""}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {overview && (
            <Badge variant={overview.lowStockCount > 0 ? "warning" : "success"}>
              {overview.totalUnits} u.
            </Badge>
          )}
        </div>
      </div>

      <div className={`grid gap-3 p-3 md:gap-4 md:p-4 ${stockOnly ? "" : "lg:grid-cols-2"}`}>
        {!stockOnly && (
        <MiniList
          title={`Ventes (${snapshot.recentSales.length})`}
          icon={ShoppingBag}
          emptyLabel="Aucune vente sur cette période"
          items={salesShown}
          mobileCollapsible
          defaultOpen
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
        )}

        <MiniList
          title={`Actions stock (${snapshot.recentStockAdds.length})`}
          icon={Package}
          emptyLabel="Aucune action stock sur cette période"
          items={stockShown}
          mobileCollapsible
          defaultOpen={stockOnly}
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
  periodLabel = "Période sélectionnée",
  stockOnly = false,
}: {
  snapshots: StoreSnapshot[];
  overviewByStore: Record<string, StoreOverviewRow>;
  periodLabel?: string;
  stockOnly?: boolean;
}) {
  if (snapshots.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="px-1 md:px-0">
        <CardHeader
          title="Vue détaillée par magasin"
          description={
            stockOnly
              ? `Mouvements stock — ${periodLabel}`
              : `Ventes et stock — ${periodLabel}`
          }
        />
      </div>

      <div className="space-y-3 md:space-y-4">
        {snapshots.map((snapshot) => (
          <StoreSnapshotCard
            key={snapshot.storeId}
            snapshot={snapshot}
            overview={overviewByStore[snapshot.storeId]}
            periodLabel={periodLabel}
            stockOnly={stockOnly}
          />
        ))}
      </div>
    </div>
  );
}
