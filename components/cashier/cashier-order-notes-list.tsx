"use client";

import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CASHIER_CONFIRMATION_STATUS_LABELS,
  confirmationFollowUpBadge,
} from "@/lib/shopify/confirmation-follow-up";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { ShopifyOrder } from "@/lib/types";

export function CashierOrderNotesList({ orders }: { orders: ShopifyOrder[] }) {
  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(orders, DEFAULT_PAGE_SIZE);

  if (orders.length === 0) {
    return (
      <Card className="px-6 py-12 text-center text-muted">
        Aucune note de suivi confirmation pour le moment.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paginated.map((order) => {
          const badge = confirmationFollowUpBadge(order);
          const statusLabel = order.cashier_confirmation_status
            ? CASHIER_CONFIRMATION_STATUS_LABELS[order.cashier_confirmation_status]
            : null;

          return (
            <Card key={order.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/cashier/shopify-orders"
                      className="font-heading text-base font-semibold text-primary hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    {statusLabel && (
                      <Badge
                        variant={
                          order.cashier_confirmation_status === "confirmed"
                            ? "success"
                            : order.cashier_confirmation_status === "no_response"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    )}
                    {badge && !order.cashier_confirmation_status && (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {order.customer_name || "Client"} — {formatCurrency(Number(order.total))}
                  </p>
                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone.replace(/\s/g, "")}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {order.customer_phone}
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {order.cashier_confirmation_at
                    ? formatDate(order.cashier_confirmation_at)
                    : "—"}
                </p>
              </div>

              {order.cashier_confirmation_note && (
                <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {order.cashier_confirmation_note}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        onPageChange={setPage}
        className="rounded-lg border border-border bg-surface px-6 py-4"
      />
    </div>
  );
}
