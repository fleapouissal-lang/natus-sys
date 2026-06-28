"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Printer, Ticket as TicketIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { useSaleTicketReprint } from "@/components/sales/sale-ticket-reprint";
import { formatCurrency, formatPaymentMethod } from "@/lib/utils";
import { listPosDailyTickets } from "@/lib/sales/pos-daily-tickets-actions";
import type { Sale } from "@/lib/types";

function formatSaleTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-MA", {
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date(iso));
}

function formatBusinessDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

export function PosDailyTicketsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-md border-0 bg-champagne text-primary hover:brightness-95 cursor-pointer"
      aria-label="Tickets du jour"
      title="Tickets du jour"
    >
      <TicketIcon className="h-4 w-4 text-primary" />
    </button>
  );
}

export function PosDailyTicketsModal({
  open,
  onClose,
  storeId,
  storeName,
}: {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName?: string;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [businessDate, setBusinessDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { reprintSale, printingSaleId, printPortal } = useSaleTicketReprint();

  const loadSales = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    const result = await listPosDailyTickets(storeId);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      setSales([]);
      setBusinessDate("");
      return;
    }
    setSales(result.sales);
    setBusinessDate(result.businessDate);
  }, [storeId]);

  useEffect(() => {
    if (!open) return;
    void loadSales();
  }, [open, loadSales]);

  return (
    <>
      {open && (
        <Modal onClose={onClose} size="md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Tickets du jour</h3>
            <p className="mt-1 text-sm text-muted">
              {storeName ? `${storeName} · ` : ""}
              Cliquez sur un ticket pour l&apos;imprimer immédiatement
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Chargement des ventes…
            </div>
          ) : error ? (
            <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          ) : sales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Aucune vente enregistrée pour le jour métier en cours.
            </p>
          ) : (
            <ul className="max-h-[min(60vh,28rem)] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {sales.map((sale) => {
                const isPrinting = printingSaleId === sale.id;
                return (
                  <li key={sale.id}>
                    <button
                      type="button"
                      onClick={() => reprintSale(sale)}
                      disabled={!!printingSaleId && !isPrinting}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-light/20 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-champagne/40 text-primary">
                        {isPrinting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-foreground">
                            N° {saleDocumentNumber(sale.id)}
                          </span>
                          <span className="text-xs text-muted">
                            {formatSaleTime(sale.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatPaymentMethod(sale.payment_method)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(Number(sale.total))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-center text-xs text-muted">
            {sales.length > 0 && businessDate
              ? `${sales.length} ticket${sales.length !== 1 ? "s" : ""} · jour métier du ${formatBusinessDateLabel(businessDate)}`
              : "Les ventes annulées ne sont pas listées."}
          </p>
        </Modal>
      )}

      {printPortal}
    </>
  );
}
