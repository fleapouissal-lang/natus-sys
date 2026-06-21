"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { DateInputField } from "@/components/ui/date-input-field";
import { formatCurrency, formatDate, toLocalDateKey, cn } from "@/lib/utils";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import { canPrepareOrderForPos } from "@/lib/shopify/order-pos";
import { paymentTypeLabel, workflowStatusLabel } from "@/lib/shopify/order-status";
import type { ShopifyOrder } from "@/lib/types";

export function PosOrdersPanel({
  orders,
  open,
  onClose,
  onSelectOrder,
}: {
  orders: ShopifyOrder[];
  open: boolean;
  onClose: () => void;
  onSelectOrder: (order: ShopifyOrder) => void;
}) {
  const defaultRange = orderDatePresetToKeys("week");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    setDateFrom(from);
    setDateTo(to);
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!canPrepareOrderForPos(order)) return false;

      const orderDay = toLocalDateKey(order.shopify_created_at || order.created_at);
      if (dateFrom && orderDay < dateFrom) return false;
      if (dateTo && orderDay > dateTo) return false;

      if (!q) return true;
      return (
        order.order_number.toLowerCase().includes(q) ||
        (order.customer_name?.toLowerCase().includes(q) ?? false) ||
        (order.customer_phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orders, search, dateFrom, dateTo]);

  if (!open) return null;

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/15 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Commandes</h3>
            <p className="text-sm text-muted">
              Sélectionnez une commande à préparer en caisse
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <OrderDatePeriodFilter
        activePreset={activeDatePreset}
        onPresetChange={applyDatePreset}
        className="mb-4"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <DateInputField label="Du" value={dateFrom} onChange={setDateFrom} />
        <DateInputField label="Au" value={dateTo} onChange={setDateTo} />
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="N° commande, client, téléphone…"
          className="natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm"
        />
      </div>

      <p className="mb-3 text-xs text-muted">
        {filteredOrders.length} commande{filteredOrders.length !== 1 ? "s" : ""}
        {activeDatePreset !== "all" ? ` — ${orderDatePresetLabel(activeDatePreset)}` : ""}
      </p>

      {filteredOrders.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          Aucune commande à préparer pour cette période
        </p>
      ) : (
        <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto scrollbar-natus">
          {filteredOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelectOrder(order)}
              className={cn(
                "flex w-full items-center justify-between gap-3 border border-border bg-surface px-4 py-3 text-left transition-colors",
                "hover:border-primary/50 hover:bg-champagne/20 cursor-pointer"
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold">{order.order_number}</p>
                <p className="truncate text-sm text-muted">
                  {order.customer_name || "Client inconnu"}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(order.shopify_created_at || order.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge variant={order.payment_type === "cod" ? "warning" : "success"}>
                  {paymentTypeLabel(order.payment_type)}
                </Badge>
                <span className="text-xs text-muted">
                  {workflowStatusLabel(order.workflow_status)}
                </span>
                <span className="font-bold text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
