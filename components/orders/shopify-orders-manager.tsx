"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Eye, Loader2, Search, ShoppingCart, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopifyOrderDetailModal } from "@/components/orders/shopify-order-detail-modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { DateInputField } from "@/components/ui/date-input-field";
import { formatCurrency, formatDate, cn, toLocalDateKey } from "@/lib/utils";
import {
  shopifyOrderStatusFilterOptions,
  shopifyPaymentTypeFilterOptions,
  workflowStatusOptions,
} from "@/lib/select-options";
import {
  WORKFLOW_STATUSES,
  workflowStatusLabel,
  paymentTypeLabel,
  isFulfillmentLocked,
  orderStatusSelectValue,
  editableWorkflowStatuses,
  resolveWorkflowStatusUpdate,
} from "@/lib/shopify/order-status";
import { updateShopifyOrderStatus, markShopifyCodPaid } from "@/lib/actions";
import type { ShopifyOrder, ShopifyPaymentType, ShopifyWorkflowStatus } from "@/lib/types";

const STATUS_CELL_WIDTH = "w-[172px]";
const ACTION_COLOR = "#B38C4A";

function OrderStatusDisplay({ status }: { status: ShopifyWorkflowStatus }) {
  const variant = statusVariant(status);

  const tone =
    variant === "success"
      ? "border-success/30 bg-success/5 text-success"
      : variant === "danger"
        ? "border-danger/30 bg-danger/5 text-danger"
        : variant === "warning"
          ? "border-primary/30 bg-primary/5 text-foreground"
          : "border-primary/30 bg-surface text-foreground";

  return (
    <div
      className={cn(
        "order-status-display inline-flex h-7 items-center justify-center border px-2",
        STATUS_CELL_WIDTH,
        tone
      )}
    >
      <span className="truncate text-[11px] font-medium leading-none">
        {workflowStatusLabel(status)}
      </span>
    </div>
  );
}

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

const COD_ACTION_BORDER = ACTION_COLOR;

function IconAction({
  label,
  onClick,
  disabled,
  loading,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
      className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-transparent hover:bg-[#B38C4A]/10"
      style={{ borderColor: COD_ACTION_BORDER, color: ACTION_COLOR }}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );
}

export function ShopifyOrdersManager({
  orders: initialOrders,
  scopeLabel,
  showStore = true,
  editable = false,
  enablePosCheckout = false,
}: {
  orders: ShopifyOrder[];
  scopeLabel: string;
  showStore?: boolean;
  editable?: boolean;
  enablePosCheckout?: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<ShopifyOrder | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"" | ShopifyPaymentType>("");
  const [statusFilter, setStatusFilter] = useState<"" | ShopifyWorkflowStatus>("");

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (paymentFilter && order.payment_type !== paymentFilter) return false;
      if (statusFilter && order.workflow_status !== statusFilter) return false;

      const orderDay = toLocalDateKey(order.shopify_created_at || order.created_at);
      if (dateFrom && orderDay < dateFrom) return false;
      if (dateTo && orderDay > dateTo) return false;

      if (!q) return true;
      return (
        order.order_number.toLowerCase().includes(q) ||
        (order.customer_name?.toLowerCase().includes(q) ?? false) ||
        (order.customer_phone?.toLowerCase().includes(q) ?? false) ||
        (order.customer_email?.toLowerCase().includes(q) ?? false) ||
        (order.shipping_address?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orders, search, dateFrom, dateTo, paymentFilter, statusFilter]);

  const hasFilters = Boolean(
    search || dateFrom || dateTo || paymentFilter || statusFilter
  );
  const filteredRevenue = filteredOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
    setStatusFilter("");
  }

  function handleStatusChange(orderId: string, status: ShopifyWorkflowStatus) {
    setMessage(null);
    setActiveId(orderId);
    startTransition(async () => {
      const result = await updateShopifyOrderStatus(orderId, status);
      if ("error" in result) {
        setMessage(result.error);
      } else {
        const nextStatus = resolveWorkflowStatusUpdate(status);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  workflow_status: nextStatus,
                  financial_status:
                    nextStatus === "paid" ? "paid" : o.financial_status,
                }
              : o
          )
        );
      }
      setActiveId(null);
      router.refresh();
    });
  }

  function handleCodPaid(orderId: string) {
    setMessage(null);
    setActiveId(orderId);
    startTransition(async () => {
      const result = await markShopifyCodPaid(orderId);
      if ("error" in result) {
        setMessage(result.error);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, workflow_status: "paid", financial_status: "paid" }
              : o
          )
        );
      }
      setActiveId(null);
      router.refresh();
    });
  }

  const colSpan = (showStore ? 1 : 0) + 8;

  return (
    <>
      {message && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Commandes Shopify</p>
          <p className="mt-1 text-2xl font-bold">{filteredOrders.length}</p>
          {hasFilters && (
            <p className="mt-1 text-xs text-muted">sur {orders.length} au total</p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-muted">Montant total</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(filteredRevenue)}</p>
        </Card>
      </div>

      <div className="natus-filter-bar overflow-visible p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary">Filtrer les commandes</p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
              >
                Tout effacer
              </button>
            )}
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">
                {filteredOrders.length}
              </span>{" "}
              commande{filteredOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:items-end">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N°, client, téléphone..."
                className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
              />
            </div>
          </div>
          <DateInputField label="Date début" value={dateFrom} onChange={setDateFrom} />
          <DateInputField label="Date fin" value={dateTo} onChange={setDateTo} />
          <SelectMenu
            label="Type de paiement"
            value={paymentFilter}
            onChange={(v) => setPaymentFilter(v as "" | ShopifyPaymentType)}
            options={shopifyPaymentTypeFilterOptions()}
            defaultIcon={Wallet}
            size="sm"
          />
          <SelectMenu
            label="Statut"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "" | ShopifyWorkflowStatus)}
            options={shopifyOrderStatusFilterOptions(WORKFLOW_STATUSES)}
            showIcons={false}
            size="sm"
          />
        </div>
      </div>

      <Card padding={false}>
        <div className="p-6">
          <CardHeader title="Commandes en ligne" description={scopeLabel} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">N°</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Client</th>
                {showStore && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Magasin</th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isCod = order.payment_type === "cod";
                const isPaid =
                  order.workflow_status === "paid" || order.financial_status === "paid";
                const isCancelled = order.workflow_status === "cancelled";
                const isReturned = order.workflow_status === "returned";
                const canEditStatus =
                  editable && !isFulfillmentLocked(order.workflow_status);
                const statusOptions = editableWorkflowStatuses(order);
                const statusValue = orderStatusSelectValue(order);
                const canPosCheckout = !order.sale_id && !isCancelled && !isReturned;
                const canMarkCodPaid =
                  isCod &&
                  Boolean(order.sale_id) &&
                  order.financial_status !== "paid" &&
                  order.workflow_status !== "paid";
                const loading = pending && activeId === order.id;

                return (
                  <tr key={order.id} className="border-b border-border">
                    <td className="px-6 py-4 font-medium">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.shopify_created_at
                        ? formatDate(order.shopify_created_at)
                        : formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <p>{order.customer_name || "—"}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-muted">{order.customer_phone}</p>
                      )}
                    </td>
                    {showStore && (
                      <td className="px-6 py-4">
                        {(order.stores as { name: string } | null)?.name || "—"}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <Badge variant={isCod ? "warning" : "success"}>
                        {paymentTypeLabel(order.payment_type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {canEditStatus ? (
                        <SelectMenu
                          value={statusValue}
                          onChange={(status) =>
                            handleStatusChange(
                              order.id,
                              status as ShopifyWorkflowStatus
                            )
                          }
                          options={workflowStatusOptions(statusOptions, {
                            icons: false,
                          })}
                          disabled={loading}
                          size="xs"
                          showIcons={false}
                          className={cn("order-status-ui", STATUS_CELL_WIDTH)}
                        />
                      ) : (
                        <OrderStatusDisplay status={order.workflow_status} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {isCod && canPosCheckout && enablePosCheckout && (
                          <IconAction
                            label="Préparer la commande"
                            onClick={() =>
                              router.push(`/cashier/pos?shopify_order=${order.id}`)
                            }
                            loading={loading}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {isCod && canMarkCodPaid && (
                          <IconAction
                            label="Marquer COD payé"
                            onClick={() => handleCodPaid(order.id)}
                            loading={loading}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {!isCod && enablePosCheckout && canPosCheckout && (
                          <IconAction
                            label="Préparer la commande"
                            onClick={() =>
                              router.push(`/cashier/pos?shopify_order=${order.id}`)
                            }
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        <IconAction
                          label="Voir la commande"
                          onClick={() => setDetailOrder(order)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </IconAction>
                        {order.sale_id && (
                          <span
                            className="flex h-8 w-8 items-center justify-center text-xs text-success"
                            title="Déjà encaissée"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-12 text-center text-muted">
                    {orders.length === 0
                      ? "Aucune commande Shopify pour cette sélection"
                      : "Aucune commande ne correspond aux filtres"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detailOrder && (
        <ShopifyOrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      )}
    </>
  );
}
