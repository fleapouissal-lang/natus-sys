"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Eye, Loader2, MessageSquare, Phone, RotateCcw, Search, ShoppingCart, Truck, Wallet, PackageCheck, ArrowRightLeft, Pencil } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopifyOrderDetailModal } from "@/components/orders/shopify-order-detail-modal";
import { OrderTransferModal } from "@/components/orders/order-transfer-modal";
import { ReturnNoteModal } from "@/components/orders/return-note-modal";
import { ConfirmationFollowUpModal } from "@/components/orders/confirmation-follow-up-modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DateInputField } from "@/components/ui/date-input-field";
import { formatCurrency, formatDate, cn, toLocalDateKey } from "@/lib/utils";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import { OrderAgeBadge } from "@/components/orders/order-age-badge";
import { orderCreatedAt } from "@/lib/shopify/order-age-urgency";
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
  isShopifyOrderFulfilled,
} from "@/lib/shopify/order-status";
import { canTransferShopifyOrder } from "@/lib/shopify/order-transfer";
import { canLivreurEditReturnNote } from "@/lib/shopify/return-note";
import {
  confirmationFollowUpBadge,
  hasCashierConfirmationNote,
  isConfirmationCallOverdue,
  isConfirmationFollowUpResolved,
} from "@/lib/shopify/confirmation-follow-up";
import { updateShopifyOrderStatus, markShopifyCodPaid, handOrderToLivreur, confirmShopifyOrderReturn } from "@/lib/actions";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { ShopifyOrder, ShopifyPaymentType, ShopifyWorkflowStatus, Store } from "@/lib/types";

const STATUS_CELL_WIDTH = "w-[172px]";
const ACTION_COLOR = "#B38C4A";

function OrderStatusDisplay({ status }: { status: ShopifyWorkflowStatus }) {
  const tone = "border-primary/30 bg-champagne text-black";

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

function IconStatus({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "prepared" | "paid";
  children: ReactNode;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "order-action-icon flex h-8 w-8 shrink-0 items-center justify-center border",
        "border-[#B38C4A] bg-transparent text-[#B38C4A] hover:bg-[#B38C4A]/10"
      )}
    >
      {children}
    </span>
  );
}

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
      className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border border-[#B38C4A] bg-transparent text-[#B38C4A] hover:bg-[#B38C4A]/10"
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
  showTransferOrigin = false,
  editable = false,
  enablePosCheckout = false,
  products = [],
  posCheckoutPath = "/cashier/pos",
  defaultDateThisWeek = false,
  livreurMode = false,
  returnsPageMode = false,
  cashierReturnsMode = false,
  livreurProfileId,
  enableLivreurHandoff = false,
  enableOrderTransfer = false,
  transferTargets = [],
  transferProfile,
  enableConfirmationFollowUp = false,
}: {
  orders: ShopifyOrder[];
  scopeLabel: string;
  showStore?: boolean;
  showTransferOrigin?: boolean;
  editable?: boolean;
  enablePosCheckout?: boolean;
  products?: import("@/lib/shopify/order-cart").ProductLineLookup[];
  posCheckoutPath?: string;
  defaultDateThisWeek?: boolean;
  livreurMode?: boolean;
  returnsPageMode?: boolean;
  cashierReturnsMode?: boolean;
  livreurProfileId?: string;
  enableLivreurHandoff?: boolean;
  enableOrderTransfer?: boolean;
  transferTargets?: Store[];
  transferProfile?: import("@/lib/types").Profile | null;
  enableConfirmationFollowUp?: boolean;
}) {
  const router = useRouter();
  const defaultDatePreset: OrderDatePreset = defaultDateThisWeek ? "week" : "all";
  const defaultDateRange = orderDatePresetToKeys(defaultDatePreset);
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<ShopifyOrder | null>(null);
  const [transferOrder, setTransferOrder] = useState<ShopifyOrder | null>(null);
  const [returnNoteOrder, setReturnNoteOrder] = useState<{
    order: ShopifyOrder;
    mode: "create" | "edit";
  } | null>(null);
  const [confirmationFollowUpOrder, setConfirmationFollowUpOrder] =
    useState<ShopifyOrder | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultDateRange.from);
  const [dateTo, setDateTo] = useState(defaultDateRange.to);
  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );
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

  const hasDateFilter =
    dateFrom !== defaultDateRange.from || dateTo !== defaultDateRange.to;

  const hasFilters = Boolean(
    search || hasDateFilter || paymentFilter || statusFilter
  );
  const filteredRevenue = filteredOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  const ordersFilterToken = `${search}|${dateFrom}|${dateTo}|${paymentFilter}|${statusFilter}`;
  const {
    paginated: paginatedOrders,
    page: ordersPage,
    setPage: setOrdersPage,
    totalPages: ordersTotalPages,
    rangeStart: ordersRangeStart,
    rangeEnd: ordersRangeEnd,
    totalItems: ordersTotalItems,
  } = usePagination(filteredOrders, DEFAULT_PAGE_SIZE, ordersFilterToken);

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    setDateFrom(from);
    setDateTo(to);
  }

  function resetFilters() {
    setSearch("");
    setDateFrom(defaultDateRange.from);
    setDateTo(defaultDateRange.to);
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

  function handleHandoffToLivreur(orderId: string) {
    setMessage(null);
    setActiveId(orderId);
    startTransition(async () => {
      const result = await handOrderToLivreur(orderId);
      if ("error" in result) {
        setMessage(result.error);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, workflow_status: "shipping" } : o
          )
        );
      }
      setActiveId(null);
      router.refresh();
    });
  }

  function handleCodPaid(orderId: string) {
    setMessage(null);
    setSuccessMessage(null);
    setActiveId(orderId);
    startTransition(async () => {
      const result = await markShopifyCodPaid(orderId);
      if ("error" in result) {
        setMessage(result.error);
      } else {
        const order = orders.find((o) => o.id === orderId);
        setSuccessMessage(
          order
            ? `Commande ${order.order_number} encaissée — ${formatCurrency(Number(order.total))} ajouté au chiffre du jour.`
            : "Commande encaissée et ajoutée au chiffre du jour."
        );
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  workflow_status: "paid",
                  financial_status: "paid",
                  paid_at: new Date().toISOString(),
                }
              : o
          )
        );
      }
      setActiveId(null);
      router.refresh();
    });
  }

  function handleConfirmReturn(orderId: string) {
    setMessage(null);
    setActiveId(orderId);
    startTransition(async () => {
      const result = await confirmShopifyOrderReturn(orderId);
      if ("error" in result) {
        setMessage(result.error);
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
      setActiveId(null);
      router.refresh();
    });
  }

  const showReturnNotes = returnsPageMode || cashierReturnsMode;
  const colSpan =
    (showStore ? 1 : 0) + (showTransferOrigin ? 1 : 0) + (showReturnNotes ? 1 : 0) + 8;

  return (
    <>
      {successMessage && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {successMessage}
        </p>
      )}
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

      <FilterTogglePanel
        toggleLabel="Filtrer les commandes"
        summary={`${filteredOrders.length} commande${filteredOrders.length !== 1 ? "s" : ""}${
          activeDatePreset !== "all" ? ` — ${orderDatePresetLabel(activeDatePreset)}` : ""
        }`}
      >
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
              {activeDatePreset !== "all" ? ` — ${orderDatePresetLabel(activeDatePreset)}` : ""}
            </p>
          </div>
        </div>
        <OrderDatePeriodFilter
          activePreset={activeDatePreset}
          onPresetChange={applyDatePreset}
          className="mb-4"
        />
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
      </FilterTogglePanel>

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
                {showTransferOrigin && (
                  <th className="px-6 py-3 text-left font-medium text-muted">
                    Transférée depuis
                  </th>
                )}
                <th className="px-6 py-3 text-left font-medium text-muted">Paiement</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
                {showReturnNotes && (
                  <th className="px-6 py-3 text-left font-medium text-muted">Note retour</th>
                )}
                <th className="px-6 py-3 text-right font-medium text-muted">Montant</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const isCod = order.payment_type === "cod";
                const isPaid =
                  order.workflow_status === "paid" || order.financial_status === "paid";
                const isCancelled = order.workflow_status === "cancelled";
                const isReturned = order.workflow_status === "returned";
                const canEditStatus =
                  editable &&
                  !livreurMode &&
                  !cashierReturnsMode &&
                  !isFulfillmentLocked(order.workflow_status);
                const statusOptions = editableWorkflowStatuses(order);
                const canHandoffToLivreur =
                  enableLivreurHandoff &&
                  order.workflow_status === "ready" &&
                  isShopifyOrderFulfilled(order) &&
                  !isCancelled &&
                  !isReturned;
                const canLivreurClose =
                  livreurMode &&
                  !returnsPageMode &&
                  order.workflow_status === "shipping";
                const statusValue = orderStatusSelectValue(order);
                const canPosCheckout =
                  !isShopifyOrderFulfilled(order) && !isCancelled && !isReturned;
                const canTransfer =
                  enableOrderTransfer &&
                  transferProfile &&
                  transferTargets.length > 0 &&
                  canTransferShopifyOrder(transferProfile, order);
                const canMarkCodPaid =
                  !livreurMode &&
                  isCod &&
                  Boolean(order.fulfilled_at) &&
                  order.financial_status !== "paid" &&
                  order.workflow_status === "delivered";
                const loading = pending && activeId === order.id;
                const canEditReturnNote =
                  returnsPageMode &&
                  livreurProfileId &&
                  canLivreurEditReturnNote(order, livreurProfileId);
                const canConfirmReturn =
                  cashierReturnsMode &&
                  isReturned &&
                  Boolean(order.fulfilled_at) &&
                  !order.return_received_at;
                const canFollowUpConfirmation =
                  enableConfirmationFollowUp &&
                  !cashierReturnsMode &&
                  Boolean(order.whatsapp_confirmation_sent_at) &&
                  !isConfirmationFollowUpResolved(order);
                const confirmationOverdue = isConfirmationCallOverdue(order);
                const orderHasFollowUpNote = hasCashierConfirmationNote(order);

                return (
                  <tr key={order.id} className="border-b border-border">
                    <td className="px-6 py-4 font-medium">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1.5">
                        <span>
                          {order.shopify_created_at
                            ? formatDate(order.shopify_created_at)
                            : formatDate(order.created_at)}
                        </span>
                        <OrderAgeBadge createdAt={orderCreatedAt(order)} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p>{order.customer_name || "—"}</p>
                      {order.customer_phone && !isConfirmationFollowUpResolved(order) && (
                        <p className="text-xs text-muted">{order.customer_phone}</p>
                      )}
                      {(() => {
                        const badge = confirmationFollowUpBadge(order);
                        if (!badge) return null;
                        return (
                          <Badge variant={badge.variant} className="mt-1.5 w-fit text-[10px]">
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </td>
                    {showStore && (
                      <td className="px-6 py-4">
                        {(order.stores as { name: string } | null)?.name || "—"}
                      </td>
                    )}
                    {showTransferOrigin && (
                      <td className="px-6 py-4">
                        {order.transferred_from_store?.name ||
                          (order.transferred_from_store_id ? "—" : "Affectation auto")}
                        {order.transferred_at && (
                          <p className="text-xs text-muted">
                            {formatDate(order.transferred_at)}
                          </p>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <Badge variant={isCod ? "warning" : "success"}>
                        {paymentTypeLabel(order.payment_type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {canLivreurClose ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            disabled={loading}
                            onClick={() => handleStatusChange(order.id, "delivered")}
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            Livré
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={loading}
                            onClick={() =>
                              setReturnNoteOrder({ order, mode: "create" })
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retour
                          </Button>
                        </div>
                      ) : canEditStatus ? (
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
                    {showReturnNotes && (
                      <td className="px-6 py-4 max-w-[220px]">
                        {order.return_note ? (
                          <div className="flex items-start gap-1.5">
                            <p className="line-clamp-3 text-sm text-foreground">
                              {order.return_note}
                            </p>
                            {canEditReturnNote && (
                              <button
                                type="button"
                                title="Modifier la note (2 h max)"
                                aria-label="Modifier la note de retour"
                                onClick={() =>
                                  setReturnNoteOrder({ order, mode: "edit" })
                                }
                                className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center border border-[#B38C4A] bg-transparent text-[#B38C4A] hover:bg-[#B38C4A]/10 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ) : isReturned ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {canConfirmReturn && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={loading}
                            onClick={() => handleConfirmReturn(order.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retour reçu
                          </Button>
                        )}
                        {!cashierReturnsMode && isCod && canPosCheckout && enablePosCheckout && (
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
                        {!cashierReturnsMode && isCod && canMarkCodPaid && (
                          <IconAction
                            label="Encaisser en caisse"
                            onClick={() => handleCodPaid(order.id)}
                            loading={loading}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {!cashierReturnsMode && !isCod && enablePosCheckout && canPosCheckout && (
                          <IconAction
                            label="Préparer la commande"
                            onClick={() =>
                              router.push(`/cashier/pos?shopify_order=${order.id}`)
                            }
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {!cashierReturnsMode && canHandoffToLivreur && (
                          <IconAction
                            label="Remise au livreur — en cours de livraison"
                            onClick={() => handleHandoffToLivreur(order.id)}
                            loading={loading}
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {!cashierReturnsMode && canTransfer && (
                          <IconAction
                            label="Transférer vers un autre magasin"
                            onClick={() => setTransferOrder(order)}
                            loading={loading}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </IconAction>
                        )}
                        {canFollowUpConfirmation && (
                          <IconAction
                            label={
                              confirmationOverdue
                                ? "Appeler le client — suivi confirmation"
                                : "Suivi confirmation client"
                            }
                            onClick={() => setConfirmationFollowUpOrder(order)}
                            loading={loading}
                          >
                            <Phone
                              className={cn(
                                "h-3.5 w-3.5",
                                confirmationOverdue && "text-danger"
                              )}
                            />
                          </IconAction>
                        )}
                        {enableConfirmationFollowUp && orderHasFollowUpNote && (
                          <IconAction
                            label="Note de suivi confirmation"
                            onClick={() => setConfirmationFollowUpOrder(order)}
                            loading={loading}
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          </IconAction>
                        )}
                        <IconAction
                          label="Voir la commande"
                          onClick={() => setDetailOrder(order)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </IconAction>
                        {!cashierReturnsMode && order.sale_id && (
                          <IconStatus label="Encaissée en caisse" tone="paid">
                            <Wallet className="h-3.5 w-3.5" />
                          </IconStatus>
                        )}
                        {!cashierReturnsMode && order.fulfilled_at && !order.sale_id && (
                          <IconStatus label="Préparée — non encaissée" tone="prepared">
                            <PackageCheck className="h-3.5 w-3.5" />
                          </IconStatus>
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
        {filteredOrders.length > 0 && (
          <PaginationBar
            page={ordersPage}
            totalPages={ordersTotalPages}
            rangeStart={ordersRangeStart}
            rangeEnd={ordersRangeEnd}
            totalItems={ordersTotalItems}
            onPageChange={setOrdersPage}
          />
        )}
      </Card>

      {detailOrder && (
        <ShopifyOrderDetailModal
          order={detailOrder}
          products={products}
          enablePosCheckout={enablePosCheckout}
          posCheckoutPath={posCheckoutPath}
          onClose={() => setDetailOrder(null)}
        />
      )}

      {returnNoteOrder && (
        <ReturnNoteModal
          order={returnNoteOrder.order}
          mode={returnNoteOrder.mode}
          onClose={() => setReturnNoteOrder(null)}
          onSaved={(note) => {
            const now = new Date().toISOString();
            setOrders((prev) =>
              prev.map((o) =>
                o.id === returnNoteOrder.order.id
                  ? {
                      ...o,
                      return_note: note,
                      ...(returnNoteOrder.mode === "create"
                        ? {
                            workflow_status: "returned" as const,
                            return_note_at: now,
                            return_note_by: livreurProfileId ?? null,
                          }
                        : {}),
                    }
                  : o
              )
            );
            router.refresh();
          }}
        />
      )}

      {confirmationFollowUpOrder && (
        <ConfirmationFollowUpModal
          order={confirmationFollowUpOrder}
          onClose={() => setConfirmationFollowUpOrder(null)}
          onSaved={(patch) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === confirmationFollowUpOrder.id
                  ? {
                      ...o,
                      ...patch,
                      ...(patch.cashier_confirmation_status === "confirmed"
                        ? { cashier_confirmation_note: null }
                        : {}),
                    }
                  : o
              )
            );
            router.refresh();
          }}
        />
      )}

      {transferOrder && (
        <OrderTransferModal
          order={transferOrder}
          targets={transferTargets}
          onClose={() => setTransferOrder(null)}
          onTransferred={() => {
            setOrders((prev) => prev.filter((o) => o.id !== transferOrder.id));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
