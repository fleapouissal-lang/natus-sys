"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { SaleDetailModal } from "@/components/sales/sale-detail-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/lib/types";

export function CashierSalesHistory({ sales }: { sales: Sale[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      const saleDay = toLocalDateKey(sale.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;

      return true;
    });
  }, [sales, dateFrom, dateTo, paymentFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, s) => sum + Number(s.total), 0);
    const cash = filtered
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const card = filtered
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { count: filtered.length, total, cash, card };
  }, [filtered]);

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Ventes affichées</p>
          <p className="mt-1 text-2xl font-bold">{stats.count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Chiffre d&apos;affaires</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.total)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Banknote className="h-4 w-4" />
            Espèces
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.cash)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <CreditCard className="h-4 w-4" />
            TPE
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.card)}</p>
        </Card>
      </div>

      <SalesAgendaFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        paymentFilter={paymentFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onPaymentChange={setPaymentFilter}
        onReset={resetFilters}
        resultCount={filtered.length}
      />

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Historique des ventes"
            description={`${filtered.length} transaction(s) — vos ventes en caisse`}
          />
        </div>

        <SalesHistoryTable
          sales={filtered}
          showStore
          onViewSale={setDetailSale}
        />
      </Card>

      {detailSale && (
        <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />
      )}
    </div>
  );
}
